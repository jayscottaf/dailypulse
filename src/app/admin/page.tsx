import { Activity, AlertTriangle, Database, Mail, Newspaper, Play, Search, Video } from "lucide-react";
import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminStats } from "@/lib/admin";
import { isAdminSession } from "@/lib/page-auth";
import { formatReportDate } from "@/lib/slug";
import {
  generateReportAction,
  rebuildSearchAction,
  runIngestionAction,
  sendTodayEmailAction,
} from "./control-actions";

function Metric({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: typeof Activity }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <Icon className="size-5 text-accent" />
      </CardContent>
    </Card>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  if (!(await isAdminSession())) return <AdminLogin error={params.error === "1"} />;

  try {
    const stats = await adminStats();
    const transcriptAvailable = stats.transcriptCounts.find((item) => item.status === "available")?.value ?? 0;

    return (
      <AppShell>
        <div className="space-y-6">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Private operations</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Today dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Generate, send, and audit Jason&apos;s daily intelligence pipeline.
              </p>
            </div>
            <Badge variant="outline">Single-user MVP</Badge>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Sources" value={stats.sourceCount} icon={Database} />
            <Metric label="Videos today" value={stats.videosToday} icon={Video} />
            <Metric label="Transcripts ready" value={transcriptAvailable} icon={Activity} />
            <Metric label="Reports" value={stats.reportsCount} icon={Newspaper} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline controls</CardTitle>
                <CardDescription>Each action runs server-side with stored secrets only.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <form action={runIngestionAction}>
                  <Button className="w-full" type="submit"><Play /> Run ingestion now</Button>
                </form>
                <form action={generateReportAction}>
                  <Button className="w-full" type="submit" variant="secondary"><Newspaper /> Generate today&apos;s report</Button>
                </form>
                <form action={sendTodayEmailAction}>
                  <Button className="w-full" type="submit" variant="outline"><Mail /> Send today&apos;s email</Button>
                </form>
                <form action={rebuildSearchAction}>
                  <Button className="w-full" type="submit" variant="outline"><Search /> Rebuild search index</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Latest status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Last ingestion run</p>
                  <p>{stats.lastRun ? `${stats.lastRun.status} at ${stats.lastRun.startedAt.toLocaleString()}` : "No run yet"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last report generation</p>
                  <p>
                    {stats.lastReport
                      ? `${formatReportDate(stats.lastReport.date)} - ${stats.lastReport.title}`
                      : "No report yet"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-accent" /> Recent errors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.recentErrors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent errors logged.</p>
              ) : (
                stats.recentErrors.map((error) => (
                  <div key={error.id} className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <p className="font-medium">{error.context}</p>
                    <p className="text-muted-foreground">{error.message}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{error.createdAt.toLocaleString()}</p>
                  </div>
                ))
              )}
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
