import { describe, expect, it } from "vitest";
import { buildBriefing, priorCoverage } from "../src/lib/briefing";
import { briefStories } from "../src/lib/stories";
import { report, source, summary, video } from "./fixtures";

const row = (id: string, topic = source.layer, title = `Specific development number ${id}`) => {
  const v = video({ id, title });
  return { video: v, source: { ...source, layer: topic }, summary: summary(v) };
};

describe("short briefing selection", () => {
  it("keeps unchanged videos out of consecutive briefs but retains the feed", () => {
    const rows = [row("1")];
    const first = buildBriefing(rows);
    const covered = priorCoverage([report({ structuredJson: first })]);
    const second = buildBriefing(rows, covered);
    expect(briefStories(first)).toHaveLength(1);
    expect(briefStories(second)).toHaveLength(0);
    expect(second.stories[0].novelty).toBe("seen");
    expect(second.status).toBe("quiet");
  });
  it("allows updated evidence but does not treat previews as covered facts", () => {
    const rows = [row("1")];
    expect(buildBriefing(rows, new Map([["1", "older-hash"]])).stories[0].novelty).toBe("updated");
    const v = video({ transcriptText: null, transcriptStatus: "unavailable" });
    const limited = buildBriefing([{ video: v, source, summary: summary(v) }]);
    expect(limited.status).toBe("limited");
    expect(priorCoverage([report({ structuredJson: limited })]).size).toBe(0);
    expect(briefStories(limited)).toEqual([]);
  });
  it("groups duplicate coverage without merging different software versions", () => {
    const same = [row("1", "tesla_ownership", "Tesla releases Full Self Driving update 14.3.9"), row("2", "tesla_ownership", "Tesla releases Full Self Driving update 14.3.9"), row("3", "tesla_ownership", "Tesla releases Full Self Driving update 14.4.0")];
    const briefing = buildBriefing(same);
    expect(briefing.stories).toHaveLength(2);
    expect(briefing.stories[0].sources).toHaveLength(2);
  });
  it("balances topics rather than taking the first three finance bullets", () => {
    const rows = [row("1", "macro_financial"), row("2", "macro_financial"), row("3", "macro_financial"), row("4", "deep_tech_ai"), row("5", "tesla_ownership"), row("6", "macro_financial")];
    const brief = briefStories(buildBriefing(rows));
    expect(brief).toHaveLength(5);
    expect(new Set(brief.map(story => story.topic)).size).toBe(3);
    expect(brief[0].summary).toContain("may");
    expect(brief[0].summary).toContain("preliminary");
  });
  it("distinguishes a failed source check from a quiet day", () => {
    expect(buildBriefing([], new Map(), true).status).toBe("source_error");
    expect(buildBriefing([]).status).toBe("quiet");
  });
});
