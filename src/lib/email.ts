import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { Resend } from "resend";
import { getDb } from "@/db/client";
import { dailyReports, emailLogs, ingestionRuns } from "@/db/schema";
import { logError } from "@/lib/errors";
import { buildEmailPayload } from "@/lib/email-template";
export { buildEmailPayload } from "@/lib/email-template";

let resend: Resend | null = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured.");
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendReportEmail(reportId: string, force = false) {
  const db = getDb();
  const [report] = await db.select().from(dailyReports).where(eq(dailyReports.id, reportId)).limit(1);
  if (!report) throw new Error("Report not found.");
  if (report.emailSentAt && !force) return { skipped: true, reportId, reason: "This briefing was already sent." };
  const payload = buildEmailPayload(report);
  if (!payload.sendable) return { skipped: true, reportId, reason: payload.reason };

  if (payload.kind === "notice") {
    const [[lastNotice], [lastRecovery]] = await Promise.all([
      db.select().from(emailLogs).where(eq(emailLogs.status, "notice_sent")).orderBy(desc(emailLogs.createdAt)).limit(1),
      db.select().from(ingestionRuns).where(eq(ingestionRuns.status, "success")).orderBy(desc(ingestionRuns.finishedAt)).limit(1),
    ]);
    if (lastNotice && (!lastRecovery?.finishedAt || lastRecovery.finishedAt <= lastNotice.createdAt)) return { skipped: true, reportId, reason: "A service notice was already sent for this interruption." };
  }

  try {
    const url = new URL(payload.reportUrl);
    if (process.env.NODE_ENV === "production" && (url.protocol !== "https:" || /^(localhost|127\.0\.0\.1)$/.test(url.hostname))) throw new Error("Set APP_BASE_URL to your public HTTPS address before sending email.");
    const message = { from: payload.from, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text };
    const fingerprint = createHash("sha256").update(JSON.stringify(message)).digest("hex").slice(0, 32);
    const result = await getResend().emails.send(message, { idempotencyKey: `daily-pulse/${report.id}/${fingerprint}` });
    if (result.error) throw new Error(result.error.message);
    if (!result.data?.id) throw new Error("Email provider did not confirm acceptance.");
    await db.insert(emailLogs).values({ reportId, recipient: payload.to, subject: payload.subject, providerMessageId: result.data.id, status: payload.kind === "notice" ? "notice_sent" : "sent" });
    if (payload.kind === "briefing") await db.update(dailyReports).set({ emailSentAt: new Date(), updatedAt: new Date() }).where(eq(dailyReports.id, reportId));
    return { skipped: false, reportId, kind: payload.kind, providerMessageId: result.data.id };
  } catch (error) {
    await db.insert(emailLogs).values({ reportId, recipient: payload.to, subject: payload.subject, status: "error", errorMessage: error instanceof Error ? error.message : String(error) });
    await logError("email sending", error, { reportId });
    throw error;
  }
}
