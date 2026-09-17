import { describe, expect, it } from "vitest";
import { buildBriefing } from "../src/lib/briefing";
import { defaultPreferences, emptyReaderContext } from "../src/lib/reader-preferences";
import { briefStories } from "../src/lib/stories";
import { source, summary, video } from "./fixtures";

describe("reader choices", () => {
  const v = video();
  const rows = [{ video: v, source, summary: summary(v) }];
  it("saving is independent from recommendation feedback", () => {
    const reader = { ...emptyReaderContext, states: { [v.id]: { saved: true, read: false, less: false } } };
    expect(buildBriefing(rows, undefined, false, undefined, reader).stories[0].score).toBe(buildBriefing(rows).stories[0].score);
    expect(briefStories(buildBriefing(rows, undefined, false, undefined, reader))).toHaveLength(1);
  });
  it("read or disliked stories remain browsable but leave new briefs", () => {
    for (const state of [{ saved: false, read: true, less: false }, { saved: false, read: false, less: true }]) {
      const result = buildBriefing(rows, undefined, false, undefined, { ...emptyReaderContext, states: { [v.id]: state } });
      expect(result.stories).toHaveLength(1);
      expect(briefStories(result)).toHaveLength(0);
    }
  });
  it("respects topic opt-outs and muted sources", () => {
    expect(buildBriefing(rows, undefined, false, undefined, { ...emptyReaderContext, preferences: { ...defaultPreferences, topics: [] } }).stories).toHaveLength(0);
    expect(buildBriefing(rows, undefined, false, undefined, { ...emptyReaderContext, preferences: { ...defaultPreferences, mutedSourceIds: [source.id] } }).stories).toHaveLength(0);
  });
  it("promotes an explicit interest without changing summary wording", () => {
    const result = buildBriefing(rows, undefined, false, undefined, { ...emptyReaderContext, preferences: { ...defaultPreferences, interests: "document" } });
    expect(result.stories[0].score).toBeGreaterThan(buildBriefing(rows).stories[0].score);
    expect(result.stories[0].summary).toBe(summary(v).conciseSummary);
  });
});
