import { describe, expect, it } from "vitest";
import { readerContext, setReadingState, setReaderPreferences } from "../src/lib/reader-store";
import { defaultPreferences } from "../src/lib/reader-preferences";

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("disposable local database persistence", () => {
  it("persists independent bookmark/read/feedback fields and preferences", async () => {
    const url = new URL(process.env.DATABASE_URL || "");
    if (url.hostname !== "127.0.0.1" || url.port !== "55432") throw new Error("Integration test requires disposable localhost:55432.");
    const id = "20000000-0000-4000-8000-000000000001";
    await setReadingState(id, "saved", true);
    await setReadingState(id, "read", true);
    const context = await readerContext();
    expect(context.states[id]).toEqual({ saved: true, read: true, less: false });
    expect(context.lessSourceIds).toEqual([]);
    await setReadingState(id, "less", true);
    expect((await readerContext()).lessSourceIds).toContain("10000000-0000-4000-8000-000000000001");
    await setReaderPreferences({ ...defaultPreferences, interests: "document workflows", briefLength: 5 });
    expect((await readerContext()).preferences.interests).toBe("document workflows");
    await setReaderPreferences(defaultPreferences);
    await setReadingState(id, "saved", false);
    await setReadingState(id, "read", false);
    await setReadingState(id, "less", false);
  });
});
