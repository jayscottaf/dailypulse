import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { BackToTop } from "@/components/app/back-to-top";
import { ScrollRestore } from "@/components/app/scroll-restore";
import { SetupPanel } from "@/components/app/setup-panel";
import { TagLink } from "@/components/app/tag-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listReports, listSources } from "@/lib/admin";
import { isAdminSession } from "@/lib/page-auth";
import { formatReportDate, todayIso } from "@/lib/slug";
import { archiveTagHref, uniqueTags } from "@/lib/tags";

const PAGE_SIZE = 20;

function isoDaysAgo(days: number) {
  const date = new Date(`${todayIso()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

// Build an /archive URL that preserves current filters, applying overrides.
// undefined/"" overrides drop that param (e.g. resetting page or clearing sort).
function archiveHref(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | number | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...overrides })) {
    if (value !== undefined && value !== null && String(value) !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `/archive?${qs}` : "/archive";
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; source?: string; from?: string; to?: string; layer?: string; page?: string; sort?: string }>;
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

    const activeFilters = [
      params.from && `from ${params.from}`,
      params.to && `to ${params.to}`,
      params.tag && `tag "${params.tag}"`,
      params.source && `source "${params.source}"`,
      params.layer && `layer "${params.layer}"`,
    ].filter(Boolean);

    const presets: { label: string; href: string }[] = [
      { label: "Last 7 days", href: `/archive?from=${isoDaysAgo(7)}` },
      { label: "Last 30 days", href: `/archive?from=${isoDaysAgo(30)}` },
      { label: "All", href: "/archive" },
    ];

    // listReports() is newest-first; reverse for oldest-first.
    const sort = params.sort === "oldest" ? "oldest" : "newest";
    const sorted = sort === "oldest" ? [...filtered].reverse() : filtered;
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
    const pageItems = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
      <AppShell>
        <div className="space-y-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Archive</p>
            <h1 className="mt-2 text-3xl font-semibold">Daily reports</h1>
          </section>

          <Card>
            <Form action="/archive">
              <CardContent className="grid gap-4 p-5 md:grid-cols-5">
                <Field name="from" label="From" type="date" defaultValue={params.from} />
                <Field name="to" label="To" type="date" defaultValue={params.to} />
                <Field name="tag" label="Tag" defaultValue={params.tag} />
                <div className="space-y-2">
                  <Label htmlFor="source">Source channel</Label>
                  <select id="source" name="source" defaultValue={params.source ?? ""} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">All sources</option>
                    {sources.map((source) => (
                      <option key={source.id} value={source.displayName}>{source.displayName}</option>
                    ))}
                  </select>
                </div>
                <Field name="layer" label="Layer/category" defaultValue={params.layer} />
              </CardContent>
              <div className="flex flex-wrap items-center gap-2 px-5 pb-5">
                <Button type="submit" size="sm">Apply filters</Button>
                <Button asChild size="sm" variant="ghost"><Link href="/archive">Clear</Link></Button>
                <span className="text-muted-foreground">·</span>
                {presets.map((preset) => (
                  <Link
                    key={preset.label}
                    href={preset.href}
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:border-accent/70 hover:text-accent"
                  >
                    {preset.label}
                  </Link>
                ))}
              </div>
            </Form>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {sorted.length} report{sorted.length === 1 ? "" : "s"}
              {activeFilters.length > 0 ? ` — filtered by ${activeFilters.join(", ")}` : ""}
              {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ""}
            </p>
            {sorted.length > 1 ? (
              <Link
                href={archiveHref(params, { sort: sort === "oldest" ? undefined : "oldest", page: undefined })}
                className="text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                {sort === "oldest" ? "Newest first" : "Oldest first"}
              </Link>
            ) : null}
          </div>

          <div className="grid gap-4">
            {pageItems.map((report) => {
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
            {sorted.length === 0 ? <p className="text-sm text-muted-foreground">No reports match those filters.</p> : null}
          </div>

          {totalPages > 1 ? (
            <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
              {currentPage > 1 ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={archiveHref(params, { page: currentPage - 1 })}>← Previous</Link>
                </Button>
              ) : <span />}
              <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</span>
              {currentPage < totalPages ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={archiveHref(params, { page: currentPage + 1 })}>Next →</Link>
                </Button>
              ) : <span />}
            </nav>
          ) : null}
        </div>
        <BackToTop />
        <Suspense fallback={null}>
          <ScrollRestore />
        </Suspense>
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
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}
