// Disposable local browser fixtures. Never run against a hosted database.
import { getDb } from "../src/db/client";
import { ensureTopicSchema } from "../src/lib/topic-schema";
import type { Source } from "../src/db/schema";
import { dailyReports, reportVideos, sources, videos, videoSummaries } from "../src/db/schema";
import { buildBriefing, briefingReport } from "../src/lib/briefing";
import { summaryHash } from "../src/lib/evidence";
import { source, video, summary } from "../tests/fixtures";
import { createReportSlug, todayIso } from "../src/lib/slug";

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.port !== "55432") throw new Error("Browser fixtures require the disposable local database on port 55432.");
  const db = getDb();
  await ensureTopicSchema();
  const examples: Array<{topic: Source["layer"]; title:string; text:string; name:string; kind?: "article" | "forum"}> = [
    { topic: "deep_tech_ai" as const, title: "An AI workflow worth trying", text: "The creator demonstrates a document-drafting workflow and says it may save time on routine first drafts. They note that results still need a human review.", name: "Demo AI Explained" },
    { topic: "tesla_ownership" as const, title: "An owner's look at the latest FSD update", text: "The reviewer reports smoother behavior on one familiar route. This is a single owner's observation, not a general safety or performance finding.", name: "Demo Tesla" },
    { topic: "macro_financial" as const, title: "How one investor evaluates debt maturities", text: "The speaker explains their method for comparing companies' debt schedules and cash flow. They describe a research process rather than recommending a specific trade.", name: "Demo Money" },
    { topic: "deep_tech_ai" as const, title: "A new video without a transcript", text: "Must not surface this unsupported claim", name: "Demo New Videos" },
    { topic: "technology", kind: "article", title: "Demo: a developer tool adds document search", text: "In this fictional browser test, the publisher describes a document search feature for a developer tool. The article says the feature is available in a limited preview and that broader availability has not been announced. Independent performance results are not provided.", name: "Demo Tech News" },
    { topic: "tesla_ownership", kind: "forum", title: "Demo: an owner shares a charging observation", text: "In this fictional browser test, one forum member describes an observation during a charging stop. The member says the result applies to one session and asks other owners about their experience. The post does not establish a general vehicle performance or safety conclusion.", name: "Demo Owner Forum" },
  ];
  const rows = [];
  for (const [index, example] of examples.entries()) {
    const id = String(index + 1).padStart(12, "0");
    const s = { ...source, id: `10000000-0000-4000-8000-${id}`, layer: example.topic, displayName: example.name, ...(example.kind ? {rssUrl: example.kind === "forum" ? "https://example.com/forums/feed/" : "https://example.com/feed/", youtubeChannelId:null, youtubeHandle:null} : {}) };
    const v = video({ id: `20000000-0000-4000-8000-${id}`, sourceId: s.id, title: example.title, youtubeVideoId: `browser-${index}`, publishedAt: new Date(), transcriptStatus: index === 3 ? "unavailable" : "available", rawMetadata: example.kind ? {contentKind: example.kind, bodyText: example.text, feedUrl:s.rssUrl, bodyBasis:"feed_excerpt"} : {}, transcriptText: index === 3 || example.kind ? null : example.text });
    const sum = summary(v, { id: `30000000-0000-4000-8000-${id}`, conciseSummary: example.text, keyClaims: [example.text], contentHash: summaryHash(v, s) });
    await db.insert(sources).values(s).onConflictDoNothing();
    await db.insert(videos).values(v).onConflictDoNothing();
    await db.insert(videoSummaries).values(sum).onConflictDoNothing();
    rows.push({ video: v, source: s, summary: sum });
  }
  const date = todayIso();
  const generated = briefingReport(date, buildBriefing(rows));
  const [report] = await db.insert(dailyReports).values({ ...generated, date, slug: createReportSlug(date), sourceVideoIds: rows.map(row => row.video.id) }).onConflictDoUpdate({ target: dailyReports.slug, set: generated }).returning();
  for (const row of rows) await db.insert(reportVideos).values({ reportId: report.id, videoId: row.video.id }).onConflictDoNothing();
  console.log(`Browser fixture ready: /daily-pulse/${report.slug}`);
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
