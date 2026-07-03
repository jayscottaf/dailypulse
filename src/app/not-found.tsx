import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <AppShell>
      <Card>
        <CardContent className="p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">404</p>
          <h1 className="mt-3 text-4xl font-semibold">Page not found.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            That link doesn&apos;t match a report, video, or page in Jason Daily Pulse.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/">Latest report</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/archive">Archive</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/search">Search</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
