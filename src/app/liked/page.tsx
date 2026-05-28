import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { ExternalLink, ThumbsUp } from "lucide-react";
import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { dailyReports, reportFeedback, sources, videos } from "@/db/schema";
import type { Source, Video } from "@/db/schema";
import { isAdminSession } from "@/lib/page-auth";

type SourceVideo = {
  video: Video;
  source: Source;
};

export default async function LikedPage() {
  if (!(await isAdminSession())) return <AdminLogin />;

  try {
    const db = getDb();
    const likedItems = await db
      .select({ feedback: reportFeedback, report: dailyReports })
      .from(reportFeedback)
      .innerJoin(dailyReports, eq(reportFeedback.reportId, dailyReports.id))
      .where(eq(reportFeedback.vote, "up"))
      .orderBy(desc(reportFeedback.updatedAt))
      .limit(100);

    const videoIds = [...new Set(likedItems.flatMap((row) => row.feedback.sourceVideoIds))];
    const videoRows =
      videoIds.length > 0
        ? await db
            .select({ video: videos, source: sources })
            .from(videos)
            .innerJoin(sources, eq(videos.sourceId, sources.id))
            .where(inArray(videos.id, videoIds))
        : [];
    const videoMap = new Map(videoRows.map((row) => [row.video.id, row as SourceVideo]));

    return (
      <AppShell>
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5 sm:p-8">
            <div className="flex items-center gap-2 text-accent">
              <ThumbsUp className="h-5 w-5" />
              <p className="font-mono text-xs uppercase tracking-[0.2em]">Preference library</p>
            </div>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Thumbed up articles</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Items you marked as useful. These become examples for future report generation and make Jason Daily Pulse
              bias toward more of the same signal.
            </p>
          </section>

          <div className="grid gap-4">
            {likedItems.length === 0 ? (
              <Card>
                <CardContent className="p-5 text-sm text-muted-foreground">
                  No thumbs-up feedback has been saved yet.
                </CardContent>
              </Card>
            ) : (
              likedItems.map(({ feedback, report }) => {
                const linkedVideos = feedback.sourceVideoIds
                  .map((videoId) => videoMap.get(videoId))
                  .filter((row): row is SourceVideo => Boolean(row));

                return (
                  <Card key={feedback.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="muted">{feedback.sectionTitle}</Badge>
                        <Badge variant="outline">{feedback.subsectionTitle}</Badge>
                      </div>
                      <CardTitle className="leading-6">{feedback.itemText}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        From{" "}
                        <Link href={`/daily-pulse/${report.slug}`} className="text-foreground underline-offset-4 hover:underline">
                          {report.title}
                        </Link>{" "}
                        on {new Date(report.date).toLocaleDateString()}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {linkedVideos.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {linkedVideos.map(({ video, source }) => (
                            <span
                              key={video.id}
                              className="inline-flex max-w-full items-center overflow-hidden rounded-md border border-border bg-muted/40 text-xs font-medium text-muted-foreground"
                              title={`${source.displayName}: ${video.title}`}
                            >
                              <Link
                                href={`/videos/${video.id}`}
                                className="truncate px-2 py-1 transition hover:text-foreground"
                              >
                                {source.displayName.split("/")[0].trim()}: {video.title}
                              </Link>
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open ${video.title} on YouTube`}
                                className="border-l border-border px-1.5 py-1 transition hover:bg-background hover:text-foreground"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No direct source video was attached to this item.</p>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/daily-pulse/${report.slug}`}>Open report</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </AppShell>
    );
  } catch (error) {
    return (
      <AppShell>
        <SetupPanel error={error} />
      </AppShell>
    );
  }
}
