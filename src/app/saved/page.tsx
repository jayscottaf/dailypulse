import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app/app-shell";
import { AdminLogin } from "@/components/app/admin-login";
import { SetupPanel } from "@/components/app/setup-panel";
import { StoryFeed } from "@/components/app/story-feed";
import { getDb } from "@/db/client";
import { sources, storyStates, videoSummaries, videos } from "@/db/schema";
import { buildBriefing } from "@/lib/briefing";
import { readerContext } from "@/lib/reader-store";
import { isAdminSession } from "@/lib/page-auth";

export default async function SavedPage() {
  await connection();
  if (!(await isAdminSession())) return <AdminLogin />;
  try {
    const reader = await readerContext();
    const rows = await getDb().select({ video: videos, source: sources, summary: videoSummaries }).from(storyStates).innerJoin(videos, eq(storyStates.videoId, videos.id)).innerJoin(sources, eq(videos.sourceId, sources.id)).leftJoin(videoSummaries, eq(videoSummaries.videoId, videos.id)).where(eq(storyStates.saved, true));
    const briefing = buildBriefing(rows);
    return <AppShell><h1 className="text-3xl font-semibold tracking-tight">Saved for a little later.</h1><p className="mb-8 mt-3 text-muted-foreground">Your bookmarks stay here. Saving does not change your recommendations.</p><StoryFeed stories={briefing.stories} title="Saved stories" reader={reader} /></AppShell>;
  } catch (error) { return <AppShell><SetupPanel error={error} /></AppShell>; }
}
