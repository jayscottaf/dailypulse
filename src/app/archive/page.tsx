import Link from "next/link";
import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { TagLink } from "@/components/app/tag-link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listReports, listSources } from "@/lib/admin";
import { isAdminSession } from "@/lib/page-auth";
import { formatReportDate } from "@/lib/slug";
import { archiveTagHref, uniqueTags } from "@/lib/tags";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; source?: string; from?: string; to?: string; layer?: string }>;
}) {
  if (!(await isAdminSession())) return <AdminLogin />;

  try {
    const params = await searchParams;
    const [reports, sources] = await Promise.all([listReports(), listSources()]);
    const filtered = reports.filter((report) => {
      const reportDate = String(report.date);
      if (params.from && reportDate < params.from) return false;
      if (params.to && reportDate > params.to) return false;
      if (params.tag && !report.tags.some((tag) => tag.toLowerCase().includes(params.tag!.toLowerCase()))) return false;
      if (params.source && !report.fullMarkdown.toLowerCase().includes(params.source.toLowerCase())) return false;
      if (params.layer && !report.fullMarkdown.toLowerCase().includes(params.layer.toLowerCase())) return false;
      return true;
    });

    return (
      <AppShell>
        <div className="space-y-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Archive</p>
            <h1 className="mt-2 text-3xl font-semibold">Daily reports</h1>
          </section>

          <Card>
            <CardContent className="grid gap-4 p-5 md:grid-cols-5">
              <Field name="from" label="From" type="date" defaultValue={params.from} />
              <Field name="to" label="To" type="date" defaultValue={params.to} />
              <Field name="tag" label="Tag" defaultValue={params.tag} />
              <div className="space-y-2">
                <Label htmlFor="source">Source channel</Label>
                <select id="source" name="source" form="archive-filter" defaultValue={params.source ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">All sources</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.displayName}>{source.displayName}</option>
                  ))}
                </select>
              </div>
              <Field name="layer" label="Layer/category" defaultValue={params.layer} />
            </CardContent>
            <form id="archive-filter" className="px-5 pb-5">
              <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">Apply filters</button>
            </form>
          </Card>

          <div className="grid gap-4">
            {filtered.map((report) => {
              const tags = uniqueTags(report.tags).slice(0, 4);

              return (
                <Card key={report.id} className="transition-colors hover:bg-muted/30">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{formatReportDate(report.date)}</p>
                        <h2 className="mt-1 text-xl font-semibold">
                          <Link href={`/daily-pulse/${report.slug}`} className="transition hover:text-accent">
                            {report.title}
                          </Link>
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">{report.summaryPreview}</p>
                        <Link
                          href={`/daily-pulse/${report.slug}`}
                          className="mt-3 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
                        >
                          Open report
                        </Link>
                      </div>
                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {tags.map((tag) => <TagLink key={tag} tag={tag} href={archiveTagHref(tag)} />)}
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No reports match those filters.</p> : null}
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

function Field({ name, label, type = "text", defaultValue }: { name: string; label: string; type?: string; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} form="archive-filter" defaultValue={defaultValue} />
    </div>
  );
}
