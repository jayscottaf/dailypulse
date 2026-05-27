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
  return videoSummaryPayloadSchema.parse(JSON.parse(text));
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

  const parsed = JSON.parse(response.output_text) as GeneratedReportPayload;
  return {
    title: parsed.title,
    summaryPreview: parsed.summaryPreview,
    fullMarkdown: parsed.fullMarkdown,
    structuredJson: parsed.structuredJson ?? {},
    tags: parsed.tags ?? [],
  };
}
