import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSources } from "@/lib/admin";
import { isAdminSession } from "@/lib/page-auth";
import { LAYERS } from "@/lib/source-roster";
import { SourceForm } from "./source-form";

export default async function SourcesPage() {
  if (!(await isAdminSession())) return <AdminLogin />;

  const layers = Object.entries(LAYERS) as [string, string][];

  try {
    const sources = await listSources();

    return (
      <AppShell>
        <div className="space-y-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Source library</p>
            <h1 className="mt-2 text-3xl font-semibold">YouTube sources</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Add channel IDs as you confirm them. Missing IDs are visible and skipped during RSS ingestion.
            </p>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Add source</CardTitle>
            </CardHeader>
            <CardContent>
              <SourceForm source={null} layers={layers} />
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {sources.map((source) => (
              <Card key={source.id} id={source.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={source.youtubeChannelId ? "secondary" : "outline"}>
                      {source.youtubeChannelId ? "RSS ready" : "Missing channel ID"}
                    </Badge>
                    <Badge variant="muted">{LAYERS[source.layer]}</Badge>
                  </div>
                  <SourceForm source={source} layers={layers} />
                </CardContent>
              </Card>
            ))}
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
