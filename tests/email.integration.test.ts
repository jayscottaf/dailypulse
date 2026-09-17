import { beforeAll, describe, expect, it, vi } from "vitest";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { dailyReports, emailLogs, ingestionRuns } from "../src/db/schema";
import { sendReportEmail } from "../src/lib/email";
import { buildBriefing } from "../src/lib/briefing";
import { report, source, summary, video } from "./fixtures";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("email delivery with local database and mocked provider", () => {
  beforeAll(() => {
    const url = new URL(process.env.DATABASE_URL || "");
    if (url.hostname !== "127.0.0.1" || url.port !== "55432") throw new Error("Requires disposable localhost:55432.");
    vi.stubEnv("RESEND_API_KEY", "mock-key");
    vi.stubEnv("APP_BASE_URL", "https://daily.example.com");
  });

  it("records rejections without marking sent, retries safely, and skips repeat sends", async () => {
    const db = getDb();
    const fixture = report({ id: "40000000-0000-4000-8000-000000000010", slug: "email-integration", structuredJson: buildBriefing([{ video: video(), source, summary: summary() }]) });
    await db.insert(dailyReports).values(fixture).onConflictDoUpdate({target:dailyReports.id,set:{emailSentAt:null,structuredJson:fixture.structuredJson}});
    send.mockResolvedValueOnce({ data: null, error: { message: "Provider rejected test message" } });
    await expect(sendReportEmail(fixture.id)).rejects.toThrow("Provider rejected test message");
    const [failed] = await db.select().from(dailyReports).where(eq(dailyReports.id, fixture.id));
    expect(failed.emailSentAt).toBeNull();
    const [log] = await db.select().from(emailLogs).where(eq(emailLogs.reportId, fixture.id)).orderBy(desc(emailLogs.createdAt));
    expect(log.status).toBe("error");
    send.mockResolvedValue({ data: { id: "mock-accepted" }, error: null });
    expect((await sendReportEmail(fixture.id)).skipped).toBe(false);
    expect(send.mock.calls[0][1].idempotencyKey).toBe(send.mock.calls[1][1].idempotencyKey);
    expect(send.mock.calls[1][0].text).toContain("results are preliminary");
    expect((await sendReportEmail(fixture.id)).skipped).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
    await db.delete(dailyReports).where(eq(dailyReports.id, fixture.id));
  });

  it("skips a quiet briefing and sends only one notice per unrecovered interruption", async () => {
    send.mockClear();
    const db = getDb();
    const fixture = report({id:"40000000-0000-4000-8000-000000000011",slug:"email-quiet-integration",structuredJson:buildBriefing([])});
    await db.insert(dailyReports).values(fixture).onConflictDoUpdate({target:dailyReports.id,set:{emailSentAt:null,structuredJson:fixture.structuredJson}});
    expect((await sendReportEmail(fixture.id)).skipped).toBe(true);
    expect(send).not.toHaveBeenCalled();
    await db.insert(ingestionRuns).values({ status: "success", finishedAt: new Date() });
    await db.update(dailyReports).set({structuredJson:{...buildBriefing([]),status:"source_error"}}).where(eq(dailyReports.id,fixture.id));
    send.mockResolvedValue({data:{id:"mock-notice"},error:null});
    expect((await sendReportEmail(fixture.id)).skipped).toBe(false);
    expect((await sendReportEmail(fixture.id)).skipped).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    const [saved] = await db.select().from(dailyReports).where(eq(dailyReports.id, fixture.id));
    expect(saved.emailSentAt).toBeNull();
    await db.delete(dailyReports).where(eq(dailyReports.id,fixture.id));
  });
});
