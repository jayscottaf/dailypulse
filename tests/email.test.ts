import { afterEach, describe, expect, it, vi } from "vitest";
import { buildEmailPayload } from "../src/lib/email-template";
import { buildBriefing } from "../src/lib/briefing";
import { sourceChecksIncomplete } from "../src/lib/source-health";
import { report, source, summary, video } from "./fixtures";

afterEach(() => vi.unstubAllEnvs());
function ready() { const v = video(); return buildBriefing([{ video: v, source, summary: summary(v) }]); }

describe("useful briefing emails", () => {
  it("uses the selected stories verbatim, preserving uncertainty, with HTML and text source links", () => {
    vi.stubEnv("APP_BASE_URL", "https://daily.example.com");
    const briefing = ready();
    const payload = buildEmailPayload(report({ structuredJson: briefing, fullMarkdown: "- Unrelated money bullet\n- Another money bullet" }));
    expect(payload.sendable).toBe(true);
    expect(payload.subject).toContain(briefing.stories[0].headline);
    expect(payload.text).toContain(briefing.stories[0].summary);
    expect(payload.html).toContain("may help draft documents; results are preliminary.");
    expect(payload.text).toContain(video().url);
    expect(payload.html).toContain(`href="${video().url}"`);
    expect(payload.text).not.toContain("Unrelated money bullet");
    expect(payload.text).toContain("https://daily.example.com/feed");
  });

  it("escapes source content and excludes unsafe links", () => {
    const briefing = ready();
    briefing.stories[0].headline = '<img src=x onerror="alert(1)">';
    briefing.stories[0].summary = 'A <script>alert(1)</script> & "quote"';
    briefing.stories[0].sources[0].url = "javascript:alert(1)";
    const payload = buildEmailPayload(report({ structuredJson: briefing }));
    expect(payload.html).not.toContain("<script>");
    expect(payload.html).not.toContain("<img");
    expect(payload.html).toContain("&lt;script&gt;");
    expect(payload.html).not.toContain('href="javascript:');
    expect(payload.text).not.toContain("javascript:");
  });

  it("skips empty, metadata-only, and previously covered briefings", () => {
    const v = video({ transcriptStatus: "unavailable", transcriptText: null });
    const cases = [buildBriefing([]), buildBriefing([{video: v, source, summary: null}]), { ...ready(), briefStoryIds: [] }];
    for (const briefing of cases) expect(buildEmailPayload(report({ structuredJson: briefing })).sendable).toBe(false);
    const seen = ready(); seen.stories[0].novelty = "seen";
    expect(buildEmailPayload(report({structuredJson: seen})).sendable).toBe(false);
  });

  it("separates incomplete source checks from news", () => {
    const payload = buildEmailPayload(report({ structuredJson: { ...ready(), status: "source_error" } }));
    expect(payload.kind).toBe("notice");
    expect(payload.subject).toContain("service notice");
    expect(payload.text).toContain("on hold");
    expect(payload.text).not.toContain(summary().conciseSummary);
  });

  it("treats stale, partial, running and absent ingestion as incomplete", () => {
    const now = new Date("2026-09-17T12:00:00Z");
    expect(sourceChecksIncomplete({ status: "success", finishedAt: now }, now)).toBe(false);
    for (const status of ["running", "partial", "error"]) expect(sourceChecksIncomplete({status, finishedAt: now}, now)).toBe(true);
    expect(sourceChecksIncomplete(null, now)).toBe(true);
    expect(sourceChecksIncomplete({status:"success", finishedAt: new Date("2026-09-16T09:00:00Z")}, now)).toBe(true);
  });
});
