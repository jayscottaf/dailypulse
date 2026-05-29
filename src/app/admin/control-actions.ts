"use server";

import { revalidatePath } from "next/cache";
import { isAdminSession } from "@/lib/page-auth";
import { rebuildSearchIndex } from "@/lib/admin";
import { sendReportEmail } from "@/lib/email";
import { runIngestion } from "@/lib/ingestion";
import { generateDailyReport, latestReport } from "@/lib/reports";
import { runAction, type ActionResult } from "@/lib/action-result";

// Re-exported so existing importers (pipeline-controls) keep their import path.
export type { ActionResult };

async function assertAdmin() {
  if (!(await isAdminSession())) throw new Error("Unauthorized.");
}

export async function runIngestionAction(): Promise<ActionResult> {
  return runAction("Ingestion", async () => {
    await assertAdmin();
    const result = await runIngestion();
    revalidatePath("/admin");
    return `Ingest complete — ${result.videosCreated} new, ${result.videosSkipped} skipped (${result.videosFound} found).`;
  });
}

export async function generateReportAction(): Promise<ActionResult> {
  return runAction("Report generation", async () => {
    await assertAdmin();
    const report = await generateDailyReport();
    revalidatePath("/admin");
    revalidatePath("/archive");
    return `Report generated: ${report.title}.`;
  });
}

export async function sendTodayEmailAction(): Promise<ActionResult> {
  return runAction("Email send", async () => {
    await assertAdmin();
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
    await assertAdmin();
    await rebuildSearchIndex();
    revalidatePath("/admin");
    return "Search index rebuilt.";
  });
}
