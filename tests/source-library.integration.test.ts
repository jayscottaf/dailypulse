import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { sources } from "../src/db/schema";
import { installSources } from "../src/lib/install-sources";
import { readerContext, setReaderPreferences } from "../src/lib/reader-store";
import { catalogSelection } from "../src/lib/source-catalog";
import { buildBriefing } from "../src/lib/briefing";
import { buildEmailPayload } from "../src/lib/email-template";
import { source, video, summary, report } from "./fixtures";

it("validates catalog choices and removes repeated selections", () => {
  expect(catalogSelection(["delta", "delta"])).toHaveLength(1);
  expect(() => catalogSelection(["untrusted"])).toThrow();
  expect(() => catalogSelection([])).toThrow();
});

it("emails useful source-backed stories with an incomplete-coverage warning", () => {
  const v = video();
  const briefing = buildBriefing([{ video: v, source, summary: summary(v) }], new Map(), true);
  expect(briefing.status).toBe("ready");
  const payload = buildEmailPayload(report({ structuredJson: briefing }));
  expect(payload.kind).toBe("briefing");
  expect(payload.html).toContain("may be missing updates");
  expect(payload.text).toContain("may be missing updates");
});

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("source library installation", () => {
  it("adds a new topic, enables it, and preserves preferences on repeat installation", async () => {
    const url = new URL(process.env.DATABASE_URL || "");
    if (url.hostname !== "127.0.0.1" || url.port !== "55432") throw new Error("Requires disposable localhost:55432.");
    const before = await readerContext();
    const db = getDb();
    await db.delete(sources).where(eq(sources.displayName, "Delta News Hub"));
    try {
      expect(await installSources(["delta"])).toBe(1);
      expect(await installSources(["delta"])).toBe(0);
      const reader = await readerContext();
      expect(reader.preferences.topics).toContain("aviation");
      expect(reader.preferences.interests).toBe(before.preferences.interests);
      expect(await db.select().from(sources).where(eq(sources.displayName, "Delta News Hub"))).toHaveLength(1);
    } finally {
      await db.delete(sources).where(eq(sources.displayName, "Delta News Hub"));
      await setReaderPreferences(before.preferences);
    }
  });
});
