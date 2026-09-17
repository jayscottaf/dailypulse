import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { privateNewsletters } from "../src/db/schema";
import { isAdminSession, isPrivateSession } from "../src/lib/page-auth";
import { importPrivateNewsletter, listPrivateNewsletters, archivePrivateNewsletter } from "../src/lib/private-newsletters";
import { searchAll } from "../src/lib/search";
import { videosForReport } from "../src/lib/ingestion";

const cookie = vi.hoisted(() => ({ value: "" }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: cookie.value }) }) }));
afterEach(() => { cookie.value = ""; vi.unstubAllEnvs(); });

it("requires a valid private session despite the public admin bypass", async () => {
  vi.stubEnv("ADMIN_AUTH_ENABLED", "false");
  vi.stubEnv("ADMIN_SECRET", "test-only-secret");
  expect(await isAdminSession()).toBe(true);
  expect(await isPrivateSession()).toBe(false);
  await expect(listPrivateNewsletters()).rejects.toThrow("Sign in");
  await expect(importPrivateNewsletter({})).rejects.toThrow("Sign in");
  await expect(archivePrivateNewsletter("bad-id", true)).rejects.toThrow("Sign in");
  cookie.value = "test-only-secret";
  expect(await isPrivateSession()).toBe(true);
  vi.stubEnv("ADMIN_SECRET", "");
  expect(await isPrivateSession()).toBe(false);
});

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("private newsletter storage", () => {
  it("deduplicates, archives and restores without appearing in the public report input", async () => {
    const url = new URL(process.env.DATABASE_URL || "");
    if (url.hostname !== "127.0.0.1" || url.port !== "55432") throw new Error("Requires disposable localhost:55432.");
    vi.stubEnv("ADMIN_SECRET", "test-only-secret");
    cookie.value = "test-only-secret";
    const item = { sender: "Synthetic test newsletter", subject: "PRIVATE-TEST-MARKER-7249", topic: "aviation", receivedAt: new Date(), body: "This synthetic private newsletter tests isolation. It contains no real email or personal information." };
    try {
      expect(await importPrivateNewsletter(item)).toBe(true);
      expect(await importPrivateNewsletter(item)).toBe(false);
      const saved = (await listPrivateNewsletters()).find(row => row.subject === item.subject)!;
      expect(saved.body).toBe(item.body);
      expect(JSON.stringify(await videosForReport())).not.toContain(item.subject);
      expect(await searchAll(item.subject)).toEqual([]);
      await archivePrivateNewsletter(saved.id, true);
      expect((await listPrivateNewsletters()).some(row => row.id === saved.id)).toBe(false);
      expect((await listPrivateNewsletters(true)).some(row => row.id === saved.id)).toBe(true);
      await archivePrivateNewsletter(saved.id, false);
      expect((await listPrivateNewsletters()).some(row => row.id === saved.id)).toBe(true);
      cookie.value = "wrong-secret";
      await expect(listPrivateNewsletters()).rejects.toThrow("Sign in");
    } finally { await getDb().delete(privateNewsletters).where(eq(privateNewsletters.subject, item.subject)); }
  });
});
