import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { CopyReportButton } from "@/components/app/copy-report-button";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { dailyReports, reportVideos, sources, videos } from "@/db/schema";
import { LAYERS } from "@/lib/source-roster";
import { formatReportDate } from "@/lib/slug";

export default async function DailyReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const db = getDb();
    const [report] = await db.select().from(dailyReports).where(eq(dailyReports.slug, slug)).limit(1);
    if (!report) notFound();

    const usedVideos = await db
      .select({ video: videos, source: sources })
      .from(reportVideos)
      .innerJoin(videos, eq(reportVideos.videoId, videos.id))
      .innerJoin(sources, eq(videos.sourceId, sources.id))
      .where(eq(reportVideos.reportId, report.id));

    return (
      <AppShell>
        <article className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{formatReportDate(report.date)}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">{report.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{report.summaryPreview}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {report.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <CopyReportButton markdown={report.fullMarkdown} />
              <Button asChild variant="outline">
                <Link href="/archive">Archive</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/search">Search</Link>
              </Button>
            </div>
          </section>

          <nav className="grid gap-2 sm:grid-cols-4">
            {["THE MACRO FINANCIAL LAYER", "THE DEEP-TECH & AI AUTOMATION LAYER", "THE TESLA OWNERSHIP & SOFTWARE LAYER", "JASON PERSONAL PULSE"].map((section) => (
              <a key={section} href={`#${section.toLowerCase().replaceAll(" ", "-")}`} className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                {section}
              </a>
            ))}
          </nav>

          <Card>
            <CardContent className="p-5 sm:p-8">
              <div className="prose-pulse max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 id={String(children).toLowerCase().replaceAll(" ", "-")}>{children}</h1>,
                    h2: ({ children }) => <h2 id={String(children).toLowerCase().replaceAll(" ", "-")}>{children}</h2>,
                  }}
                >
                  {report.fullMarkdown}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Source attribution</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {usedVideos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No source videos were attached to this report.</p>
              ) : (
                usedVideos.map(({ video, source }) => (
                  <div key={video.id} className="rounded-md border border-border bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted">{LAYERS[source.layer]}</Badge>
                      <Badge variant="outline">{video.transcriptStatus}</Badge>
                    </div>
                    <h3 className="mt-2 font-semibold">{video.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {source.displayName} - {video.publishedAt.toLocaleDateString()}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={video.url} target="_blank" rel="noreferrer"><ExternalLink /> Open video</a>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/videos/${video.id}`}>Video detail</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </article>
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
