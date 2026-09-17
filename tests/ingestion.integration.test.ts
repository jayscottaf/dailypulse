import { describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { ingestionRuns, sources, videos } from "../src/db/schema";
import { runIngestion } from "../src/lib/ingestion";
import { source } from "./fixtures";

const { fetchFeed, transcript } = vi.hoisted(() => ({ fetchFeed: vi.fn(), transcript: vi.fn() }));
vi.mock("../src/lib/rss", () => ({ fetchYoutubeRssVideos: fetchFeed, filterNewVideos: (rows: { publishedAt: Date }[], since: Date) => rows.filter(row => row.publishedAt >= since) }));
vi.mock("../src/lib/transcripts", () => ({ fetchTranscript: transcript }));

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("source failure recovery with local database and mocked feeds", () => {
  it("reports partial failure, recovers older missed updates and skips duplicate transcript work", async () => {
    const url = new URL(process.env.DATABASE_URL || "");
    if (url.hostname !== "127.0.0.1" || url.port !== "55432") throw new Error("Requires disposable localhost:55432.");
    const db = getDb();
    await db.delete(videos).where(eq(videos.youtubeVideoId,"recovery-test"));
    const ids = ["10000000-0000-4000-8000-000000000020", "10000000-0000-4000-8000-000000000021"];
    await db.insert(sources).values(ids.map((id, i) => ({...source,id,displayName:`Recovery test ${i}`,rssUrl:`https://www.youtube.com/feeds/${i}`})));
    await db.insert(ingestionRuns).values({status:"success", finishedAt:new Date()});
    fetchFeed.mockImplementation(async (url: string) => {
      if (url.endsWith("/1")) throw new Error("Mock feed unavailable");
      if (!url.endsWith("/0")) return [];
      return [{ youtubeVideoId:"recovery-test", title:"Recovered older story", description:"", url:"https://www.youtube.com/watch?v=recovery-test", publishedAt:new Date(Date.now()-3*86400000), thumbnailUrl:null, rawMetadata:{} }];
    });
    transcript.mockResolvedValue({ status:"unavailable",text:null });
    try {
      const result = await runIngestion({summarize:false});
      expect(result.ok).toBe(false);
      expect(result.failedSources).toBeGreaterThan(0);
      const [run] = await db.select().from(ingestionRuns).where(eq(ingestionRuns.id,result.runId));
      expect(run.status).toBe("partial");
      expect(run.metadata.failedSourceIds).toContain(ids[1]);
      expect(await db.select().from(videos).where(eq(videos.youtubeVideoId,"recovery-test"))).toHaveLength(1);
      await runIngestion({summarize:false});
      expect(transcript).toHaveBeenCalledTimes(1);
    } finally { await db.delete(videos).where(eq(videos.youtubeVideoId,"recovery-test")); await db.delete(sources).where(inArray(sources.id,ids)); }
  });
});
