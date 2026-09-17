import type { FeedbackProfile } from "@/lib/feedback";
import type { DailyReport } from "@/db/schema";
import type { ReportInputVideo } from "@/lib/ai";
import { sourceEvidence, summaryHash } from "@/lib/evidence";
import { briefStories, parseBriefing, TOPICS, type Briefing, type Story } from "@/lib/stories";
import { formatReportDate } from "@/lib/slug";

export function priorCoverage(reports: Pick<DailyReport, "structuredJson" | "sourceVideoIds">[]) {
  const covered = new Map<string, string>();
  // Caller supplies newest first; never overwrite newer evidence with older hashes.
  for (const report of reports) {
    const briefing = parseBriefing(report.structuredJson);
    if (briefing) {
      for (const story of briefStories(briefing)) {
        for (const source of story.sources) if (!covered.has(source.id)) covered.set(source.id, source.contentHash);
      }
    } else {
      for (const id of report.sourceVideoIds) if (!covered.has(id)) covered.set(id, "legacy");
    }
  }
  return covered;
}

function titleWords(title: string) {
  return new Set(title.toLowerCase().replace(/#[\w]+/g, "").replace(/[^a-z0-9. ]/g, " ").split(/\s+/).filter(word => word.length > 2 && !["the", "and", "with", "this", "that", "for", "new", "just", "about", "from"].includes(word)));
}

export function sameStory(a: Story, b: Story) {
  if (a.topic !== b.topic || a.evidence !== b.evidence) return false;
  const left = titleWords(a.headline), right = titleWords(b.headline);
  if (left.size < 4 || right.size < 4) return false;
  // Different model/version numbers are separate developments, even with similar titles.
  const numbers = (words: Set<string>) => [...words].filter(word => /\d/.test(word)).sort().join(",");
  if (numbers(left) !== numbers(right)) return false;
  const overlap = [...left].filter(word => right.has(word)).length;
  return overlap / new Set([...left, ...right]).size >= 0.8;
}

export function buildBriefing(rows: ReportInputVideo[], covered = new Map<string, string>(), sourceError = false, feedback?: FeedbackProfile): Briefing {
  const candidates: Story[] = rows.map(({ video, source, summary }) => {
    const evidence = sourceEvidence(video, source, summary);
    const hash = summaryHash(video, source);
    const prior = covered.get(video.id);
    const tags = evidence.summary.tags.map(tag => tag.toLowerCase());
    const preference = (feedback?.likedTags.some(tag => tags.includes(tag.value.toLowerCase())) ? 10 : 0) - (feedback?.dislikedTags.some(tag => tags.includes(tag.value.toLowerCase())) ? 10 : 0);
    const novelty = !prior ? "new" : prior === hash || evidence.basis === "metadata" ? "seen" : "updated";
    return {
      id: video.id, headline: video.title.replace(/\s*#[\w]+/g, "").trim() || video.title,
      summary: evidence.summary.conciseSummary,
      details: evidence.summary.keyClaims.slice(0, 3), topic: source.layer,
      evidence: evidence.basis, novelty, contentHash: hash,
      score: (evidence.basis === "transcript" ? 100 : 0) + (novelty !== "seen" ? 30 : 0) + Math.min(100, evidence.summary.relevanceScoreForJason) + preference,
      sources: [{ id: video.id, name: source.displayName.split("/")[0].trim(), url: video.url, publishedAt: video.publishedAt.toISOString(), thumbnailUrl: video.thumbnailUrl, contentHash: hash }],
    };
  });
  candidates.sort((a, b) => b.score - a.score || b.sources[0].publishedAt.localeCompare(a.sources[0].publishedAt));
  const stories: Story[] = [];
  for (const candidate of candidates) {
    const existing = stories.find(story => sameStory(story, candidate));
    if (existing) {
      existing.sources.push(...candidate.sources);
      // Repeated coverage alone is not a new development.
      if (existing.novelty === "seen" || candidate.novelty === "seen") existing.novelty = "seen";
    } else stories.push(candidate);
  }
  const eligible = stories.filter(story => story.evidence === "transcript" && story.novelty !== "seen");
  // Start with one strong story per topic, then fill remaining slots by rank.
  const selected: Story[] = [];
  for (const story of eligible) if (!selected.some(item => item.topic === story.topic)) selected.push(story);
  for (const story of eligible) if (selected.length < 5 && !selected.includes(story)) selected.push(story);
  selected.sort((a, b) => b.score - a.score);
  const status = sourceError ? "source_error" : selected.length ? "ready" : stories.some(s => s.evidence === "metadata" && s.novelty !== "seen") ? "limited" : "quiet";
  const message = status === "source_error" ? "Source checks are incomplete. The feed may be missing updates." : status === "ready" ? `${selected.length} new or updated ${selected.length === 1 ? "story" : "stories"} worth a look.` : status === "limited" ? "New videos to explore. Transcript summaries are not available yet." : "You're caught up. No new transcript-backed stories today.";
  return { version: 2, status, stories, briefStoryIds: selected.map(story => story.id), message };
}

export function briefingReport(date: string, briefing: Briefing) {
  const brief = briefStories(briefing);
  const title = brief[0]?.headline ?? `Daily Pulse — ${formatReportDate(date)}`;
  const sections = [{ title: "Your short briefing", subsections: [{ title: "Worth knowing", items: brief.length ? brief.map(s => ({ text: `${s.headline}: ${s.summary}`, sourceVideoIds: s.sources.map(source => source.id) })) : [{ text: briefing.message, sourceVideoIds: [] }] }] }];
  const fullMarkdown = `# ${title}\n\n${briefing.message}\n\n${brief.map(story => `## ${story.headline}\n\n${story.summary}\n\n${story.sources.map(source => `[${source.name}](${source.url})`).join(" · ")}`).join("\n\n")}`;
  return { title, summaryPreview: briefing.message, fullMarkdown, structuredJson: { ...briefing, sections }, tags: [...new Set(brief.map(story => TOPICS[story.topic]))] };
}
