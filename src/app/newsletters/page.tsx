import Link from "next/link";
import { connection } from "next/server";
import { AppShell } from "@/components/app/app-shell";
import { AdminLogin } from "@/components/app/admin-login";
import { Button } from "@/components/ui/button";
import { isPrivateSession } from "@/lib/page-auth";
import { listPrivateNewsletters } from "@/lib/private-newsletters";
import { TOPICS } from "@/lib/topics";
import { lockPrivateInbox } from "@/app/admin/actions";
import { NewsletterImportForm } from "./import-form";
import { archiveNewsletterAction } from "./actions";

export default async function NewslettersPage({ searchParams }: { searchParams: Promise<{ error?: string; archived?: string }> }) {
  await connection();
  const params = await searchParams;
  if (!(await isPrivateSession())) {
    if (!process.env.ADMIN_SECRET) return <AppShell><h1 className="text-2xl font-semibold">Private newsletters need sign-in setup.</h1><p className="mt-3 text-muted-foreground">Private imports stay disabled until private access is configured.</p></AppShell>;
    return <AdminLogin returnTo="/newsletters" error={params.error === "1"} />;
  }
  const archived = params.archived === "1";
  const newsletters = await listPrivateNewsletters(archived);
  return <AppShell><div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-accent">Private inbox</p><h1 className="mt-2 text-3xl font-semibold">Newsletters worth keeping.</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Keep useful excerpts from aviation, property and travel newsletters here. Gmail is not connected; you choose what to import.</p></div><form action={lockPrivateInbox}><Button variant="outline">Lock private inbox</Button></form></div>
    {!archived && <NewsletterImportForm />}
    <nav className="flex gap-5 text-sm"><Link className={!archived ? "font-semibold underline" : "text-muted-foreground"} href="/newsletters">Inbox</Link><Link className={archived ? "font-semibold underline" : "text-muted-foreground"} href="/newsletters?archived=1">Archived</Link></nav>
    {!newsletters.length && <p className="py-6 text-sm text-muted-foreground">{archived ? "No archived newsletters." : "Your private inbox is empty. Save an excerpt above to begin."}</p>}
    {newsletters.map(item => <article key={item.id} className="rounded-xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{TOPICS[item.topic as keyof typeof TOPICS] ?? "Newsletter"} · {item.sender} · {item.receivedAt.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}</p><h2 className="mt-2 text-xl font-semibold">{item.subject}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{item.body.slice(0, 360)}{item.body.length > 360 ? "…" : ""}</p>{item.body.length > 360 && <details className="mt-4"><summary className="cursor-pointer text-sm">Read saved excerpt</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p></details>}<form action={archiveNewsletterAction} className="mt-4"><input type="hidden" name="id" value={item.id} /><input type="hidden" name="archived" value={String(!archived)} /><Button variant="outline" size="sm">{archived ? "Restore to inbox" : "Archive"}</Button></form></article>)}
  </div></AppShell>;
}
