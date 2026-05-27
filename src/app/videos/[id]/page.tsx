import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/db/client";
import { sources, videoSummaries, videos } from "@/db/schema";
import { isAdminSession } from "@/lib/page-auth";
import { LAYERS } from "@/lib/source-roster";
import { saveManualTranscript } from "./actions";

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

    return (
      <AppShell>
        <div className="space-y-6">
          <section>
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted">{LAYERS[row.source.layer]}</Badge>
              <Badge variant="outline">{row.video.transcriptStatus}</Badge>
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
            <CardHeader><CardTitle>AI summary</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              {row.summary ? (
                <>
                  <p className="text-muted-foreground">{row.summary.conciseSummary}</p>
                  <div className="flex flex-wrap gap-2">{row.summary.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>
                  <p>Jason relevance: {row.summary.relevanceScoreForJason}/100</p>
                </>
              ) : (
                <p className="text-muted-foreground">No AI summary saved yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Transcript</CardTitle></CardHeader>
            <CardContent>
              <form action={saveManualTranscript} className="space-y-3">
                <input type="hidden" name="id" value={row.video.id} />
                <Textarea name="transcriptText" defaultValue={row.video.transcriptText ?? ""} placeholder="Paste or edit transcript text here." />
                <Button type="submit">Save manual transcript</Button>
              </form>
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
