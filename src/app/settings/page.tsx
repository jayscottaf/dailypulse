import Link from "next/link";
import { connection } from "next/server";
import { AppShell } from "@/components/app/app-shell";
import { AdminLogin } from "@/components/app/admin-login";
import { SetupPanel } from "@/components/app/setup-panel";
import { ReaderSettings } from "@/components/app/reader-settings";
import { readerContext } from "@/lib/reader-store";
import { isAdminSession } from "@/lib/page-auth";
import { listSources } from "@/lib/admin";

export default async function SettingsPage() {
  await connection();
  if (!(await isAdminSession())) return <AdminLogin />;
  try {
    const [reader, sources] = await Promise.all([readerContext(), listSources()]);
    return <AppShell><h1 className="text-3xl font-semibold tracking-tight">Make it your Pulse.</h1><p className="mb-8 mt-3 text-muted-foreground">Choose what matters and how you like to read.</p><ReaderSettings preferences={reader.preferences} sources={sources.map(({ id, displayName }) => ({ id, displayName }))} /><nav className="mt-10 flex flex-wrap gap-5 border-t border-border pt-5 text-sm"><Link href="/sources" className="underline">Manage sources</Link><Link href="/admin" className="underline">Pipeline & delivery</Link><Link href="/newsletters" className="underline">Private newsletters</Link><Link href="/email-preview" className="underline">Email preview</Link><Link href="/liked" className="underline">Previous feedback</Link></nav></AppShell>;
  } catch (error) { return <AppShell><SetupPanel error={error} /></AppShell>; }
}
