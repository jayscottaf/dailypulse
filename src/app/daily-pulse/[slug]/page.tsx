import { EVIDENCE_LABELS } from "@/lib/content-kind";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, unstable_rethrow } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app/app-shell";
import { BackToTop } from "@/components/app/back-to-top";
import { SetupPanel } from "@/components/app/setup-panel";
import { StoryFeed } from "@/components/app/story-feed";
import { getDb } from "@/db/client";
import { dailyReports } from "@/db/schema";
import { adjacentReports } from "@/lib/reports";
import { readerContext } from "@/lib/reader-store";
import { readingReport, filterReadingReport } from "@/lib/reading";
import { briefStories, parseBriefing } from "@/lib/stories";
import { formatReportDate } from "@/lib/slug";

export default async function DailyReportPage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  try {
    const [report] = await getDb().select().from(dailyReports).where(eq(dailyReports.slug, slug)).limit(1);
    if (!report) notFound();
    const [rawBriefing, adjacent, reader] = await Promise.all([readingReport(report), adjacentReports(report.date), readerContext()]);
    const briefing = filterReadingReport(rawBriefing, reader);
    const brief = briefStories(briefing);
    const isLatest = adjacent.latest?.id === report.id;
    return <AppShell>
      <article className="space-y-10">
        <section aria-label="Your short briefing" className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><time className="font-medium uppercase tracking-widest text-accent" dateTime={report.date}>{formatReportDate(report.date)}</time><span>Updated {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York", timeZoneName: "short" }).format(report.generatedAt)}</span>{!isLatest && adjacent.latest ? <Link className="underline" href={`/daily-pulse/${adjacent.latest.slug}`}>Go to latest briefing →</Link> : null}</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{brief.length ? "A few things worth knowing." : "Your daily catch-up."}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{briefing.message}</p>
          {brief.length ? <ol className="mt-6 space-y-5">{brief.map((story, index) => <li key={story.id} className="flex gap-4"><span className="pt-0.5 font-mono text-sm text-accent" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h2 className="font-semibold leading-6"><Link href={`/videos/${story.id}`} className="hover:text-accent">{story.headline}</Link></h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{story.summary}</p><p className="mt-1 text-xs text-muted-foreground">{story.sources[0].name} · {story.novelty === "updated" ? "Updated · " : ""}{EVIDENCE_LABELS[story.evidence]}</p></div></li>)}</ol> : null}
        </section>
        <StoryFeed stories={briefing.stories} reader={reader} />
        <nav aria-label="Report navigation" className="flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-sm text-muted-foreground">
          {adjacent.previous ? <Link href={`/daily-pulse/${adjacent.previous.slug}`}>← {formatReportDate(adjacent.previous.date)}</Link> : <span />}
          <Link href="/archive">All briefings</Link>
          {adjacent.next ? <Link href={`/daily-pulse/${adjacent.next.slug}`}>{formatReportDate(adjacent.next.date)} →</Link> : <span />}
        </nav>
        {!parseBriefing(report.structuredJson) ? <details className="border-t border-border pt-5"><summary className="cursor-pointer text-sm text-muted-foreground">Original archived report</summary><p className="mt-4 text-sm text-muted-foreground">This older AI report may contain unsupported claims. The feed above uses current source-evidence checks.</p><div className="prose-pulse mt-4 max-w-3xl"><ReactMarkdown>{report.fullMarkdown}</ReactMarkdown></div></details> : null}
      </article>
      <BackToTop />
    </AppShell>;
  } catch (error) {
    unstable_rethrow(error);
    return <AppShell><SetupPanel error={error} /></AppShell>;
  }
}
