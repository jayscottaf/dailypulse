import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { getDb } from "@/db/client";
import { dailyReports, emailLogs } from "@/db/schema";
import { appBaseUrl, emailFrom, emailTo } from "@/lib/config";
import { logError } from "@/lib/errors";
import { formatReportDate } from "@/lib/slug";

let resend: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export function extractTopBullets(markdown: string, limit = 3) {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .slice(0, limit)
    .map((line) => line.replace(/^- /, ""));
}

export function buildEmailPayload(report: typeof dailyReports.$inferSelect) {
  const reportUrl = `${appBaseUrl()}/daily-pulse/${report.slug}`;
  const bullets = extractTopBullets(report.fullMarkdown);
  const subject = `Jason Daily Pulse — ${formatReportDate(report.date)}`;

  const html = `
    <div style="font-family:Arial,sans-serif;background:#0b0d10;color:#f4f4f5;padding:28px">
      <div style="max-width:680px;margin:0 auto">
        <p style="color:#d4af37;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Jason Daily Pulse</p>
        <h1 style="font-size:28px;line-height:1.2;margin:0 0 12px">${report.title}</h1>
        <p style="color:#d4d4d8;font-size:16px;line-height:1.6">${report.summaryPreview}</p>
        <ul style="color:#f4f4f5;line-height:1.7">${bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>
        <p style="margin:28px 0">
          <a href="${reportUrl}" style="background:#d4af37;color:#101010;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">Open full briefing</a>
        </p>
        <p style="color:#a1a1aa;font-size:14px">
          <a href="${appBaseUrl()}/archive" style="color:#f8e7a5">Archive</a> &nbsp;|&nbsp;
          <a href="${appBaseUrl()}/search" style="color:#f8e7a5">Search</a>
        </p>
      </div>
    </div>
  `;

  return {
    from: emailFrom(),
    to: emailTo(),
    subject,
    html,
    reportUrl,
    bullets,
  };
}

export async function sendReportEmail(reportId: string, force = false) {
  const db = getDb();
  const [report] = await db.select().from(dailyReports).where(eq(dailyReports.id, reportId)).limit(1);
  if (!report) throw new Error("Report not found.");
  if (report.emailSentAt && !force) {
    return { skipped: true, reportId: report.id };
  }

  const payload = buildEmailPayload(report);

  try {
    const result = await getResend().emails.send({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    await db.insert(emailLogs).values({
      reportId: report.id,
      recipient: payload.to,
      subject: payload.subject,
      providerMessageId: result.data?.id,
      status: "sent",
    });
    await db.update(dailyReports).set({ emailSentAt: new Date(), updatedAt: new Date() }).where(eq(dailyReports.id, report.id));

    return { skipped: false, reportId: report.id, providerMessageId: result.data?.id };
  } catch (error) {
    await db.insert(emailLogs).values({
      reportId: report.id,
      recipient: payload.to,
      subject: payload.subject,
      status: "error",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    await logError("email sending", error, { reportId: report.id });
    throw error;
  }
}
