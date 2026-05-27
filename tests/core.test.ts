import { describe, expect, it, vi } from "vitest";
import { buildEmailPayload, extractTopBullets } from "../src/lib/email";
import { filterNewVideos } from "../src/lib/rss";
import { normalizeSearchQuery } from "../src/lib/search";
import { createReportSlug } from "../src/lib/slug";
import { validateCronSecret } from "../src/lib/auth";

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
});
