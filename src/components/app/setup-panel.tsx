import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupPanel({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Setup needed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>The app shell is ready, but this page needs a configured database and environment secrets.</p>
        <p className="rounded-md bg-muted p-3 font-mono text-xs text-foreground">{message}</p>
        <p>Set `DATABASE_URL`, run the migration and seed commands, then refresh this page.</p>
      </CardContent>
    </Card>
  );
}
