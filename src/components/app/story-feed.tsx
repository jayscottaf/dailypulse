"use client";

import { EVIDENCE_LABELS } from "@/lib/content-kind";

import Image from "next/image";
import Link from "next/link";
import { StoryControls } from "@/components/app/story-controls";
import { emptyReaderContext, type ReaderContext } from "@/lib/reader-preferences";
import { useState } from "react";
import { ExternalLink, Play, Newspaper, MessagesSquare, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOPICS, safeSourceUrl, type Story } from "@/lib/stories";

function Thumbnail({ story }: { story: Story }) {
  const [failed, setFailed] = useState(false);
  const url = story.sources[0].thumbnailUrl;
  const allowed = url && /^https:\/\/(?:[a-z0-9-]+\.)?ytimg\.com\/(?:vi|vi_webp)\//i.test(url);
  const Icon = story.kind === "article" ? Newspaper : story.kind === "forum" ? MessagesSquare : Play;
  return <div className="story-image">
    {allowed && !failed ? <Image src={url} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px" className="object-cover" unoptimized onError={() => setFailed(true)} /> : <><Icon className="size-7" aria-hidden="true" /><span>{story.kind && story.kind !== "video" ? story.sources[0].name : TOPICS[story.topic]}</span></>}
  </div>;
}

export function StoryFeed({ stories, title = "Explore your feed", reader = emptyReaderContext }: { stories: Story[]; title?: string; reader?: ReaderContext }) {
  const [topic, setTopic] = useState("all");
  const [layout, setLayout] = useState<"cards" | "list">(reader.preferences.layout);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const visible = stories.filter(story => (topic === "all" || story.topic === topic) && (!unreadOnly || !reader.states[story.id]?.read));
  return <section id="feed" className="scroll-mt-24 space-y-5" aria-label={title}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-1 text-sm text-muted-foreground" aria-live="polite">{visible.length} {visible.length === 1 ? "story" : "stories"} · open only what interests you</p></div>
      <div className="flex gap-1" aria-label="Feed layout"><Button variant="ghost" aria-label="Card view" aria-pressed={layout === "cards"} onClick={() => setLayout("cards")}><LayoutGrid /></Button><Button variant="ghost" aria-label="List view" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List /></Button></div>
    </div>
    <div className="flex flex-wrap gap-2" aria-label="Filter by topic">
      {[["all", "All"], ...Object.entries(TOPICS)].map(([value, label]) => <Button key={value} size="sm" variant={topic === value ? "default" : "outline"} aria-pressed={topic === value} onClick={() => setTopic(value)}>{label}</Button>)}
      <Button size="sm" variant="outline" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(!unreadOnly)}>Unread only</Button>
    </div>
    <div className={layout === "cards" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
      {visible.map(story => <article id={`story-${story.id}`} key={story.id} className="story-card scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card">
        {layout === "cards" ? <Thumbnail story={story} /> : null}
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><span className="font-medium text-accent">{TOPICS[story.topic]}</span><span>·</span><span>{story.novelty === "seen" ? "Previously covered" : story.novelty === "updated" ? "Updated summary" : "New"}</span><span>·</span><time dateTime={story.sources[0].publishedAt}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(story.sources[0].publishedAt))}</time></div>
          <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight">{story.headline}</h3>
          <p className="mt-2 text-xs text-muted-foreground">{story.sources[0].name}{story.sources.length > 1 ? ` + ${story.sources.length - 1} more sources` : ""}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{story.summary}</p>
          <span className="mt-4 inline-block rounded border border-border px-2 py-1 text-xs">{EVIDENCE_LABELS[story.evidence]}</span>
          <details className="mt-4 border-t border-border pt-3">
            <summary className="cursor-pointer py-1 text-sm font-medium">Details & sources</summary>
            <div className="mt-3 space-y-3 text-sm leading-6">
              {story.details.length ? <ul className="list-disc space-y-2 pl-5">{story.details.map((detail, i) => <li key={i}>{detail}</li>)}</ul> : null}
              <p className="text-xs text-muted-foreground">{story.evidence === "transcript" ? "These are the creator's claims, summarized from a transcript excerpt. They have not been independently verified." : story.evidence === "article" ? "Summarized from the publisher’s available text. The excerpt may be incomplete; open the original for full context." : story.evidence === "forum" ? "This summarizes an individual forum post, not verified reporting or community consensus." : "Source text is not available. The title alone does not establish the claims."}</p>
              {story.sources.map(source => <div key={source.id} className="flex flex-wrap items-center justify-between gap-2"><Link className="underline underline-offset-4" href={`/videos/${source.id}`}>{source.name}</Link>{safeSourceUrl(source.url) ? <a className="inline-flex items-center gap-1 text-accent" href={safeSourceUrl(source.url)!} target="_blank" rel="noreferrer">{(source.kind ?? story.kind ?? "video") === "video" ? "Watch video" : (source.kind ?? story.kind) === "forum" ? "Open discussion" : "Read article"} <ExternalLink className="size-3" /></a> : null}</div>)}
            </div>
          </details>
          <StoryControls videoId={story.id} initial={reader.states[story.id]} />
        </div>
      </article>)}
    </div>
    {visible.length === 0 ? <p className="py-8 text-sm text-muted-foreground">{stories.length ? "No stories match these filters. Try All or turn off Unread only." : title === "Saved stories" ? "Save a story from your feed to find it here." : "No stories yet. Check back after the next source update."}</p> : null}
  </section>;
}
