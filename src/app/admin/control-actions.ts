"use server";

import { revalidatePath } from "next/cache";
import { isAdminSession } from "@/lib/page-auth";
import { rebuildSearchIndex } from "@/lib/admin";
import { sendReportEmail } from "@/lib/email";
import { runIngestion } from "@/lib/ingestion";
import { generateDailyReport, latestReport } from "@/lib/reports";

async function assertAdmin() {
  if (!(await isAdminSession())) throw new Error("Unauthorized.");
}

export async function runIngestionAction() {
  await assertAdmin();
  await runIngestion();
  revalidatePath("/admin");
}

export async function generateReportAction() {
  await assertAdmin();
  await generateDailyReport();
  revalidatePath("/admin");
  revalidatePath("/archive");
}

export async function sendTodayEmailAction() {
  await assertAdmin();
  const report = await latestReport();
  if (!report) throw new Error("No report available.");
  await sendReportEmail(report.id);
  revalidatePath("/admin");
}

export async function rebuildSearchAction() {
  await assertAdmin();
  await rebuildSearchIndex();
  revalidatePath("/admin");
}
