import { eq } from "drizzle-orm";
import { Clock, ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { TagLink } from "@/components/app/tag-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { sources, videoSummaries, videos } from "@/db/schema";
import { isAdminSession } from "@/lib/page-auth";
import { LAYERS } from "@/lib/source-roster";
import { searchTagHref, uniqueTags } from "@/lib/tags";
import { extractTimelineLinks } from "@/lib/video-timeline";
import { sourceEvidence } from "@/lib/evidence";
import { TranscriptForm } from "./transcript-form";

function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="rounded-md border border-border bg-muted/20 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) return <AdminLogin />;
  const { id } = await params;

  try {
    const [row] = await getDb()
      .select({ video: videos, source: sources, summary: videoSummaries })
      .from(videos)
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .leftJoin(videoSummaries, eq(videoSummaries.videoId, videos.id))
      .where(eq(videos.id, id))
      .limit(1);

    if (!row) {
      return <AppShell><p className="text-sm text-muted-foreground">Video not found.</p></AppShell>;
    }

    const evidence = sourceEvidence(row.video, row.source, row.summary);
    const summary = evidence.summary;
    const timelineLinks = extractTimelineLinks({
      videoUrl: row.video.url,
      description: row.video.description,
      transcriptText: row.video.transcriptText,
    });

    return (
      <AppShell>
        <div className="space-y-6">
          <section>
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted">{LAYERS[row.source.layer]}</Badge>
              <Badge variant="outline">{evidence.label}</Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold">{row.video.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {row.source.displayName} - {row.video.publishedAt.toLocaleString()}
            </p>
            <Button asChild className="mt-4" variant="outline">
              <a href={row.video.url} target="_blank" rel="noreferrer"><ExternalLink /> Open video</a>
            </Button>
          </section>

          <Card>
            <CardHeader><CardTitle>Source overview</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {summary ? (
                <>
                  <p className="text-sm leading-6 text-muted-foreground">{summary.conciseSummary}</p>
                  {summary.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {uniqueTags(summary.tags).map((tag) => (
                        <TagLink key={tag} tag={tag} href={searchTagHref(tag)} />
                      ))}
                    </div>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{evidence.basis === "transcript" ? "Summarized from the source transcript. Creator claims are not independently verified." : "No factual summary is available. Open the original video for its contents."}</p>
                  <SummaryList title="Key claims" items={summary.keyClaims} />
                  <SummaryList title="Important data points" items={summary.importantDataPoints} />
                  <SummaryList title="Quotes or paraphrases" items={summary.quotesOrParaphrases} />
                  <SummaryList title="Action signals" items={summary.actionSignals} />
                </>
              ) : (
                <p className="text-muted-foreground">No AI summary saved yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Timeline links</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {timelineLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No timestamped transcript or description entries are available for this video yet.
                </p>
              ) : (
                timelineLinks.map((item) => (
                  <a
                    key={`${item.label}-${item.seconds}`}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex gap-3 rounded-md border border-border bg-muted/20 p-3 text-sm transition hover:border-accent/60 hover:bg-muted/40"
                  >
                    <span className="inline-flex h-8 min-w-16 items-center justify-center gap-1 rounded-md bg-background font-mono text-xs text-accent">
                      <Clock className="h-3 w-3" />
                      {item.label}
                    </span>
                    <span className="leading-6 text-muted-foreground">{item.context || "Open video at this timestamp"}</span>
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Transcript</CardTitle></CardHeader>
            <CardContent>
              <TranscriptForm videoId={row.video.id} defaultValue={row.video.transcriptText ?? ""} />
            </CardContent>
          </Card>
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
