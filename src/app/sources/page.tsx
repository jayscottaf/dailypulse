import { AdminLogin } from "@/components/app/admin-login";
import { AppShell } from "@/components/app/app-shell";
import { SetupPanel } from "@/components/app/setup-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listSources } from "@/lib/admin";
import { isAdminSession } from "@/lib/page-auth";
import { LAYERS } from "@/lib/source-roster";
import { saveSource } from "./actions";

export default async function SourcesPage() {
  if (!(await isAdminSession())) return <AdminLogin />;

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
              <form action={saveSource} className="grid gap-4 md:grid-cols-2">
                <Field name="displayName" label="Display name" required />
                <div className="space-y-2">
                  <Label htmlFor="layer">Layer</Label>
                  <select id="layer" name="layer" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {Object.entries(LAYERS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <Field name="youtubeChannelId" label="YouTube channel ID" />
                <Field name="youtubeHandle" label="YouTube handle" />
                <Field name="rssUrl" label="RSS URL" />
                <label className="flex items-center gap-2 pt-8 text-sm">
                  <input name="isActive" type="checkbox" defaultChecked /> Active
                </label>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="focusDescription">Focus description</Label>
                  <Textarea id="focusDescription" name="focusDescription" required />
                </div>
                <Button type="submit" className="md:col-span-2">Save source</Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {sources.map((source) => (
              <Card key={source.id} id={source.id}>
                <CardContent className="p-5">
                  <form action={saveSource} className="grid gap-4 md:grid-cols-2">
                    <input type="hidden" name="id" value={source.id} />
                    <div className="md:col-span-2 flex flex-wrap items-center gap-2">
                      <Badge variant={source.youtubeChannelId ? "secondary" : "outline"}>
                        {source.youtubeChannelId ? "RSS ready" : "Missing channel ID"}
                      </Badge>
                      <Badge variant="muted">{LAYERS[source.layer]}</Badge>
                    </div>
                    <Field name="displayName" label="Display name" defaultValue={source.displayName} required />
                    <div className="space-y-2">
                      <Label htmlFor={`layer-${source.id}`}>Layer</Label>
                      <select id={`layer-${source.id}`} name="layer" defaultValue={source.layer} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {Object.entries(LAYERS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <Field name="youtubeChannelId" label="YouTube channel ID" defaultValue={source.youtubeChannelId ?? ""} />
                    <Field name="youtubeHandle" label="YouTube handle" defaultValue={source.youtubeHandle ?? ""} />
                    <Field name="rssUrl" label="RSS URL" defaultValue={source.rssUrl ?? ""} />
                    <label className="flex items-center gap-2 pt-8 text-sm">
                      <input name="isActive" type="checkbox" defaultChecked={source.isActive} /> Active
                    </label>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`focus-${source.id}`}>Focus description</Label>
                      <Textarea id={`focus-${source.id}`} name="focusDescription" defaultValue={source.focusDescription} required />
                    </div>
                    <Button type="submit" variant="outline" className="md:col-span-2">Update source</Button>
                  </form>
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

function Field({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} required={required} />
    </div>
  );
}
