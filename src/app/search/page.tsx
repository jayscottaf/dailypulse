import Link from "next/link";
import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isAdminSession } from "@/lib/page-auth";
import { searchAll } from "@/lib/search";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!(await isAdminSession())) return <AdminLogin />;

  const params = await searchParams;
  const query = params.q ?? "";

  try {
    const results = await searchAll(query);

    return (
      <AppShell>
        <div className="space-y-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Search</p>
            <h1 className="mt-2 text-3xl font-semibold">Reports, videos, sources</h1>
          </section>

          <form className="flex gap-2">
            <Input name="q" defaultValue={query} placeholder="Search macro liquidity, Tesla FSD, AI agents..." />
            <Button type="submit">Search</Button>
          </form>

          <div className="grid gap-3">
            {query && results.length === 0 ? <p className="text-sm text-muted-foreground">No results found.</p> : null}
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
