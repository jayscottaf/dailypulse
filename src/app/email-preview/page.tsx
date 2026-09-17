import { connection } from "next/server";
import { AppShell } from "@/components/app/app-shell";
import { AdminLogin } from "@/components/app/admin-login";
import { SetupPanel } from "@/components/app/setup-panel";
import { isAdminSession } from "@/lib/page-auth";
import { latestReport } from "@/lib/reports";
import { buildEmailPayload } from "@/lib/email-template";

export default async function EmailPreviewPage() {
  await connection();
  if (!(await isAdminSession())) return <AdminLogin />;
  try {
    const report = await latestReport();
    const payload = report ? buildEmailPayload(report) : null;
    return <AppShell><h1 className="text-3xl font-semibold tracking-tight">Your email, before it sends.</h1><p className="mt-3 text-muted-foreground">A preview of the latest report. Opening this page sends nothing.</p>{payload ? <div className="mt-7 space-y-5"><p className="text-sm"><strong>Subject:</strong> {payload.subject}</p>{!payload.sendable ? <p role="status" className="rounded-lg border border-border p-4 text-sm">Email skipped: {payload.reason}</p> : payload.kind === "notice" ? <p className="text-sm text-muted-foreground">This is a service notice. An ongoing interruption is only emailed once until source checks recover.</p> : report?.emailSentAt ? <p className="text-sm text-muted-foreground">This report was already emailed. The preview reflects the current template; it will not automatically resend.</p> : null}<iframe title="Email preview" srcDoc={payload.html} sandbox="" className="h-[850px] w-full max-w-3xl rounded-lg border border-border bg-white" /><details><summary className="cursor-pointer text-sm">Plain text version</summary><pre className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6">{payload.text}</pre></details></div> : <p className="mt-7">Generate a briefing to see its email preview.</p>}</AppShell>;
  } catch (error) { return <AppShell><SetupPanel error={error} /></AppShell>; }
}
