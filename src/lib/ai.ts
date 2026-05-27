import crypto from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import type { Source, Video, VideoSummary } from "@/db/schema";
import { LAYERS } from "@/lib/source-roster";
import { formatReportDate } from "@/lib/slug";

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

export const videoSummaryPayloadSchema = z.object({
  conciseSummary: z.string(),
  keyClaims: z.array(z.string()).default([]),
  importantDataPoints: z.array(z.string()).default([]),
  quotesOrParaphrases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  relevanceScoreForJason: z.number().int().min(0).max(100).default(50),
  actionSignals: z.array(z.string()).default([]),
});

export type VideoSummaryPayload = z.infer<typeof videoSummaryPayloadSchema>;

function parseJsonObject<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(jsonText) as T;
}

export function contentHash(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function buildVideoSummaryInput(video: Video, source: Source) {
  const transcript =
    video.transcriptText && video.transcriptText.trim().length > 0
      ? video.transcriptText
      : "Transcript unavailable. Use title, description, source focus, and metadata only.";

  return [
    `Source: ${source.displayName}`,
    `Layer: ${LAYERS[source.layer]}`,
    `Source focus: ${source.focusDescription}`,
    `Video title: ${video.title}`,
    `Description: ${video.description ?? "No description"}`,
    `Published: ${video.publishedAt.toISOString()}`,
    `Transcript status: ${video.transcriptStatus}`,
    `Transcript or metadata basis:\n${transcript.slice(0, 35000)}`,
  ].join("\n\n");
}

export async function summarizeVideo(video: Video, source: Source): Promise<VideoSummaryPayload> {
  const input = buildVideoSummaryInput(video, source);
  const client = getOpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are Jason Mergl's private intelligence analyst. Return strict JSON only. Extract 5-10 key points, data points, investing implications, AI execution implications, Tesla ownership implications if relevant, confidence based on transcript quality, suggested tags, and direct action signals. Be concise and high-signal.",
      },
      {
        role: "user",
        content: input,
      },
    ],
  });

  const text = response.output_text;
  return videoSummaryPayloadSchema.parse(parseJsonObject(text));
}

export type ReportInputVideo = {
  video: Video;
  source: Source;
  summary: VideoSummary;
};

export type GeneratedReportPayload = {
  title: string;
  summaryPreview: string;
  fullMarkdown: string;
  structuredJson: Record<string, unknown>;
  tags: string[];
};

export function buildDailyReportPrompt(reportDate: string, videos: ReportInputVideo[]) {
  const grouped = videos.map(({ video, source, summary }) => ({
    layer: LAYERS[source.layer],
    source: source.displayName,
    focus: source.focusDescription,
    title: video.title,
    url: video.url,
    publishedAt: video.publishedAt,
    transcriptStatus: video.transcriptStatus,
    conciseSummary: summary.conciseSummary,
    keyClaims: summary.keyClaims,
    dataPoints: summary.importantDataPoints,
    tags: summary.tags,
    relevanceScoreForJason: summary.relevanceScoreForJason,
    actionSignals: summary.actionSignals,
  }));

  return `Generate Jason's daily briefing for ${formatReportDate(reportDate)}.

Required top-level structure:
1. THE MACRO FINANCIAL LAYER
2. THE DEEP-TECH & AI AUTOMATION LAYER
3. THE TESLA OWNERSHIP & SOFTWARE LAYER
4. JASON PERSONAL PULSE

For each of the first three layers include exactly these subsections:
- Highlights & Breakdown
- How It Affects Me

Jason Personal Pulse must include:
- Health / Layover Fuel
- Money / Real Estate / Tax
- Projects / AI Business Execution
- Vehicle / Tesla Ownership
- One Priority Today

Delivery rules:
- Lead with substance. No fluff.
- Do not begin with "Here is your report."
- Use markdown section headers, bolding, and bullets.
- If a layer has no fresh videos, write exactly: "No high-signal new source video found in this layer during this run."
- Personalize to Jason: investing, macro flows, AI execution, automation businesses, real estate/tax strategy, and premium Tesla ownership.
- End directly after the final section.

Return JSON only with:
{
  "title": string,
  "summaryPreview": string,
  "fullMarkdown": string,
  "structuredJson": object,
  "tags": string[]
}

Source summaries:
${JSON.stringify(grouped, null, 2)}`;
}

export async function generateDailyReportMarkdown(
  reportDate: string,
  videos: ReportInputVideo[],
): Promise<GeneratedReportPayload> {
  if (videos.length === 0) {
    const formattedDate = formatReportDate(reportDate);
    const fullMarkdown = `# Daily Intelligence Briefing - ${formattedDate}

## THE MACRO FINANCIAL LAYER

### Highlights & Breakdown

No high-signal new source video found in this layer during this run.

### How It Affects Me

- Do not treat this run as a market update.
- Wait for fresh source material before changing investing, real estate, or tax assumptions.
- Keep the next review focused on liquidity, bond yields, margins, and cash-flow compounders once new source videos are available.

## THE DEEP-TECH & AI AUTOMATION LAYER

### Highlights & Breakdown

No high-signal new source video found in this layer during this run.

### How It Affects Me

- Do not infer new AI platform, model, or automation opportunities from this report.
- Keep current AI business execution priorities stable until fresh source material is ingested.
- The next high-value action is improving source coverage, transcripts, and ingestion reliability.

## THE TESLA OWNERSHIP & SOFTWARE LAYER

### Highlights & Breakdown

No high-signal new source video found in this layer during this run.

### How It Affects Me

- No new Tesla software, FSD, ownership, accessory, battery, or road-trip recommendation is supported by source data in this run.
- Keep current vehicle settings and ownership habits unchanged until new source videos are ingested.

## JASON PERSONAL PULSE

### Health / Layover Fuel

- No fresh source-driven health or travel fuel signal in this run.

### Money / Real Estate / Tax

- No fresh source-driven investing, real estate, or tax signal in this run.

### Projects / AI Business Execution

- Priority is operational: confirm YouTube channel IDs, RSS ingestion, and transcript coverage so future reports are source-backed.

### Vehicle / Tesla Ownership

- No fresh source-backed Tesla action today.

### One Priority Today

- Finish source setup and run ingestion again before relying on this dashboard for decisions.`;

    return {
      title: `Jason Mergl Daily Intelligence Briefing - ${formattedDate}`,
      summaryPreview:
        "No fresh source-backed videos were available for this run. Treat this as an operational setup report, not a market, AI, or Tesla update.",
      fullMarkdown,
      structuredJson: {
        sourceStatus: "no_source_videos",
        layers: ["macro_financial", "deep_tech_ai", "tesla_ownership"],
      },
      tags: ["setup", "source coverage", "ingestion"],
    };
  }

  const client = getOpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You produce a private daily intelligence briefing for Jason Mergl. Return strict JSON only. Prioritize signal over completeness and avoid conversational wrap-up.",
      },
      { role: "user", content: buildDailyReportPrompt(reportDate, videos) },
    ],
  });

  const parsed = parseJsonObject<GeneratedReportPayload>(response.output_text);
  return {
    title: parsed.title,
    summaryPreview: parsed.summaryPreview,
    fullMarkdown: parsed.fullMarkdown,
    structuredJson: parsed.structuredJson ?? {},
    tags: parsed.tags ?? [],
  };
}
