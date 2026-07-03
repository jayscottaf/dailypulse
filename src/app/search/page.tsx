import Form from "next/form";
import Link from "next/link";
import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isAdminSession } from "@/lib/page-auth";
import { normalizeSearchQuery, searchAll } from "@/lib/search";

const EXAMPLE_QUERIES = ["macro liquidity", "Tesla FSD", "AI agents", "bond yields", "Model Y"];

function ExampleQueries({ label }: { label: string }) {
  return (
    <div className="text-sm text-muted-foreground">
      <p>{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((example) => (
          <Link
            key={example}
            href={`/search?q=${encodeURIComponent(example)}`}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:border-accent/70 hover:text-accent"
          >
            {example}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!(await isAdminSession())) return <AdminLogin />;

  const params = await searchParams;
  const query = params.q ?? "";
  const normalized = normalizeSearchQuery(query);

  try {
    const results = normalized ? await searchAll(query) : [];

    return (
      <AppShell>
        <div className="space-y-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Search</p>
            <h1 className="mt-2 text-3xl font-semibold">Reports, videos, sources</h1>
          </section>

          <Form action="/search" className="flex gap-2">
            <Input name="q" defaultValue={query} placeholder="Search macro liquidity, Tesla FSD, AI agents..." />
            <Button type="submit">Search</Button>
          </Form>

          {normalized ? (
            <p className="text-sm text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"} for{" "}
              <span className="font-medium text-foreground">&ldquo;{normalized}&rdquo;</span>
            </p>
          ) : (
            <ExampleQueries label="Try a topic:" />
          )}

          <div className="grid gap-3">
            {normalized && results.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">No results found. Try broader or different terms.</p>
                <ExampleQueries label="Or try a topic:" />
              </div>
            ) : null}
            {results.map((result) => (
              <Link key={`${result.type}-${result.id}`} href={result.href}>
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{result.type}</Badge>
                      {result.date ? <span className="font-mono text-xs text-muted-foreground">{result.date}</span> : null}
                    </div>
                    <h2 className="mt-2 text-lg font-semibold">{result.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: result.snippet }} />
                  </CardContent>
                </Card>
              </Link>
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
