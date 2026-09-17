import { connection } from "next/server";
import { AppShell } from "@/components/app/app-shell";
import { AdminLogin } from "@/components/app/admin-login";
import { SetupPanel } from "@/components/app/setup-panel";
import { StoryFeed } from "@/components/app/story-feed";
import { isAdminSession } from "@/lib/page-auth";
import { readerContext } from "@/lib/reader-store";
import { readingFeed } from "@/lib/reading";

export default async function FeedPage() {
  await connection();
  if (!(await isAdminSession())) return <AdminLogin />;
  try {
    const [briefing, reader] = await Promise.all([readingFeed(), readerContext()]);
    return <AppShell><div className="mb-8"><p className="text-xs font-medium uppercase tracking-widest text-accent">Your sources · Last 7 days</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">A little more to explore.</h1></div><StoryFeed stories={briefing.stories} reader={reader} /></AppShell>;
  } catch (error) { return <AppShell><SetupPanel error={error} /></AppShell>; }
}
