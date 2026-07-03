import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { listSources } from "@/lib/admin";
import { isAdminSession } from "@/lib/page-auth";
import { LAYERS } from "@/lib/source-roster";
import { AddSourceCard } from "./add-source-card";
import { SourceCard } from "./source-card";

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
            <p className="mt-1 text-sm text-muted-foreground">
              {sources.length} source{sources.length === 1 ? "" : "s"} - click one to edit.
            </p>
          </section>

          <AddSourceCard layers={layers} />

          <div className="grid gap-3">
            {sources.map((source) => (
              <SourceCard key={source.id} source={source} layers={layers} />
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
