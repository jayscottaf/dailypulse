import { describe, expect, it, vi } from "vitest";
import { buildEmailPayload, extractTopBullets } from "../src/lib/email";
import { filterNewVideos } from "../src/lib/rss";
import { normalizeSearchQuery, normalizeSearchRows } from "../src/lib/search";
import { createReportSlug } from "../src/lib/slug";
import { validateCronSecret } from "../src/lib/auth";
import { buildDailyReportPrompt, generateDailyReportMarkdown } from "../src/lib/ai";
import { feedbackFingerprint } from "../src/lib/feedback";
import { parseReportStructure } from "../src/lib/report-structure";
import { archiveTagHref, searchTagHref, uniqueTags } from "../src/lib/tags";
import { extractTimelineLinks, videoUrlAtTime } from "../src/lib/video-timeline";

describe("core utilities", () => {
  it("creates stable report slugs", () => {
    expect(createReportSlug("2026-05-27")).toBe("daily-pulse-2026-05-27");
  });

  it("filters RSS videos by publish date", () => {
    const since = new Date("2026-05-20T00:00:00Z");
    const videos = [
      { publishedAt: new Date("2026-05-19T23:59:59Z") },
      { publishedAt: new Date("2026-05-20T00:00:00Z") },
    ];
    expect(filterNewVideos(videos, since)).toHaveLength(1);
  });

  it("normalizes search queries", () => {
    expect(normalizeSearchQuery("  AI    liquidity   ")).toBe("AI liquidity");
  });

  it("unwraps raw SQL search rows from Neon results", () => {
    expect(
      normalizeSearchRows({
        rows: [
          {
            type: "video",
            id: "video-1",
            title: "Value Investing",
            snippet: "Margin of safety",
            date: "2026-05-27",
            href: "/videos/video-1",
            rank: 0.5,
          },
        ],
      }),
    ).toEqual([
      {
        type: "video",
        id: "video-1",
        title: "Value Investing",
        snippet: "Margin of safety",
        date: "2026-05-27",
        href: "/videos/video-1",
      },
    ]);
  });

  it("validates cron bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    expect(validateCronSecret("Bearer cron-secret")).toBe(true);
    expect(validateCronSecret("cron-secret")).toBe(false);
    vi.unstubAllEnvs();
  });

  it("extracts email bullets", () => {
    expect(extractTopBullets("- one\n- two\n\nbody", 2)).toEqual(["one", "two"]);
  });

  it("builds the report email payload", () => {
    vi.stubEnv("APP_BASE_URL", "https://daily.example.com");
    vi.stubEnv("EMAIL_TO", "jayscottaf@gmail.com");
    vi.stubEnv("EMAIL_FROM", "Pulse <pulse@example.com>");
    const payload = buildEmailPayload({
      id: "report-id",
      date: "2026-05-27",
      title: "Jason Daily Pulse",
      slug: "daily-pulse-2026-05-27",
      summaryPreview: "High-signal preview.",
      fullMarkdown: "- First\n- Second\n- Third",
      structuredJson: {},
      sourceVideoIds: [],
      tags: [],
      generatedAt: new Date(),
      emailSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(payload.to).toBe("jayscottaf@gmail.com");
    expect(payload.subject).toBe("Jason Daily Pulse — May 27, 2026");
    expect(payload.reportUrl).toBe("https://daily.example.com/daily-pulse/daily-pulse-2026-05-27");
    vi.unstubAllEnvs();
  });

  it("normalizes structured report source ids", () => {
    const parsed = parseReportStructure({
      sections: [
        {
          title: "THE MACRO FINANCIAL LAYER",
          subsections: [
            {
              title: "Highlights & Breakdown",
              items: [{ text: "A source-backed point.", source_video_ids: ["video-1"] }],
            },
          ],
        },
      ],
    });

    expect(parsed?.sections[0].subsections[0].items[0].sourceVideoIds).toEqual(["video-1"]);
  });

  it("builds structured no-source report fallback", async () => {
    const report = await generateDailyReportMarkdown("2026-05-27", []);
    const parsed = parseReportStructure(report.structuredJson);

    expect(parsed?.sections).toHaveLength(4);
    expect(parsed?.sections[0].subsections[0].items[0].sourceVideoIds).toEqual([]);
  });

  it("creates stable feedback fingerprints", () => {
    const input = {
      reportId: "report-id",
      sectionTitle: "THE MACRO FINANCIAL LAYER",
      subsectionTitle: "Highlights & Breakdown",
      itemIndex: 0,
      itemText: "A source-backed point.",
    };

    expect(feedbackFingerprint(input)).toBe(feedbackFingerprint(input));
    expect(feedbackFingerprint({ ...input, itemIndex: 1 })).not.toBe(feedbackFingerprint(input));
  });

  it("includes feedback profile in report prompts", () => {
    const prompt = buildDailyReportPrompt("2026-05-27", [], {
      totalVotes: 1,
      totalUp: 1,
      totalDown: 0,
      likedTags: [{ value: "Tesla Software", votes: 1 }],
      dislikedTags: [],
      likedSections: [{ value: "THE TESLA OWNERSHIP & SOFTWARE LAYER", votes: 1 }],
      dislikedSections: [],
      likedExamples: [
        {
          section: "THE TESLA OWNERSHIP & SOFTWARE LAYER",
          subsection: "Highlights & Breakdown",
          text: "Practical Tesla software update.",
          tags: ["Tesla Software"],
          sourceVideoIds: ["video-1"],
        },
      ],
      dislikedExamples: [],
    });

    expect(prompt).toContain("Jason preference profile");
    expect(prompt).toContain("Practical Tesla software update.");
  });

  it("builds timestamped YouTube timeline links", () => {
    expect(videoUrlAtTime("https://www.youtube.com/watch?v=abc123", 95)).toBe(
      "https://www.youtube.com/watch?v=abc123&t=95s",
    );

    const links = extractTimelineLinks({
      videoUrl: "https://www.youtube.com/watch?v=abc123",
      description: "0:00 Intro\n12:34 Macro setup\n1:02:03 Long segment",
    });

    expect(links.map((link) => link.seconds)).toEqual([0, 754, 3723]);
    expect(links[1].href).toBe("https://www.youtube.com/watch?v=abc123&t=754s");
  });

  it("builds encoded tag navigation links", () => {
    expect(archiveTagHref("no-code AI")).toBe("/archive?tag=no-code+AI");
    expect(searchTagHref("human-in-the-loop")).toBe("/search?q=human-in-the-loop");
    expect(uniqueTags([" Tesla ", "Tesla", "", "OTA update"])).toEqual(["Tesla", "OTA update"]);
  });
});
