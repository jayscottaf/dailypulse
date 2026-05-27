import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DailyReport } from "@/db/schema";
import { latestReport } from "@/lib/reports";

export default async function HomePage() {
  let report: DailyReport | null = null;
  try {
    report = await latestReport();
  } catch (error) {
    return (
      <AppShell>
        <SetupPanel error={error} />
      </AppShell>
    );
  }
  if (report) redirect(`/daily-pulse/${report.slug}`);

  return (
    <AppShell>
      <Card>
        <CardContent className="p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Jason Daily Pulse</p>
          <h1 className="mt-3 text-4xl font-semibold">No report generated yet.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Open the admin dashboard after configuring the database and secrets, seed sources, run ingestion, then generate the first briefing.
          </p>
          <Button asChild className="mt-6">
            <Link href="/admin">Open admin</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
