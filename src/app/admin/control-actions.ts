"use server";

import { revalidatePath } from "next/cache";
import { isAdminSession } from "@/lib/page-auth";
import { rebuildSearchIndex } from "@/lib/admin";
import { sendReportEmail } from "@/lib/email";
import { runIngestion } from "@/lib/ingestion";
import { generateDailyReport, latestReport } from "@/lib/reports";

export type ActionResult = { ok: boolean; message: string };

async function assertAdmin() {
  if (!(await isAdminSession())) throw new Error("Unauthorized.");
}

// Each action returns a structured result instead of throwing, so the client
// controls can surface success/failure feedback inline rather than the user
// having to reload to guess whether anything happened.
async function runAction(label: string, fn: () => Promise<string>): Promise<ActionResult> {
  try {
    await assertAdmin();
    const message = await fn();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: `${label} failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function runIngestionAction(): Promise<ActionResult> {
  return runAction("Ingestion", async () => {
    const result = await runIngestion();
    revalidatePath("/admin");
    return `Ingest complete — ${result.videosCreated} new, ${result.videosSkipped} skipped (${result.videosFound} found).`;
  });
}

export async function generateReportAction(): Promise<ActionResult> {
  return runAction("Report generation", async () => {
    const report = await generateDailyReport();
    revalidatePath("/admin");
    revalidatePath("/archive");
    return `Report generated: ${report.title}.`;
  });
}

export async function sendTodayEmailAction(): Promise<ActionResult> {
  return runAction("Email send", async () => {
    const report = await latestReport();
    if (!report) throw new Error("No report available — generate one first.");
    const result = await sendReportEmail(report.id);
    revalidatePath("/admin");
    return result.skipped
      ? "Email already sent for the latest report (not resent)."
      : "Email sent to the configured recipient.";
  });
}

export async function rebuildSearchAction(): Promise<ActionResult> {
  return runAction("Search rebuild", async () => {
    await rebuildSearchIndex();
    revalidatePath("/admin");
    return "Search index rebuilt.";
  });
}
