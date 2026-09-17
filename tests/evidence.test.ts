import { describe, expect, it } from "vitest";
import { generateDailyReportMarkdown, summarizeVideo } from "../src/lib/ai";
import { hasTranscript, sourceEvidence, summaryInput } from "../src/lib/evidence";
import { source, summary, video } from "./fixtures";

describe("source evidence boundaries", () => {
  it("does not ask AI to invent a summary when the transcript is absent", async () => {
    const v = video({ transcriptText: null, transcriptStatus: "unavailable" });
    const result = await summarizeVideo(v, source);
    expect(result.conciseSummary).toContain("title-only preview");
    expect(result.keyClaims).toEqual([]);
    expect(result.actionSignals).toEqual([]);
  });
  it("does not treat an empty transcript or status alone as evidence", () => {
    expect(hasTranscript(video({ transcriptText: " " }))).toBe(false);
    expect(hasTranscript(video({ transcriptStatus: "error" }))).toBe(false);
    expect(hasTranscript(video({ transcriptStatus: "manual" }))).toBe(true);
  });
  it("rejects legacy and stale summaries even after a transcript is pasted", () => {
    const v = video();
    expect(sourceEvidence(v, source, summary(v)).basis).toBe("transcript");
    expect(sourceEvidence(v, source, summary(v, { contentHash: "legacy" })).basis).toBe("metadata");
    expect(sourceEvidence({ ...v, transcriptText: "Different evidence" }, source, summary(v)).basis).toBe("metadata");
  });
  it("keeps channel descriptions out of evidence and unsafe prior claims out of report input", () => {
    const v = video({ transcriptText: null, transcriptStatus: "unavailable" });
    expect(summaryInput(v, source)).not.toContain(source.focusDescription);
    const prompt = JSON.stringify(sourceEvidence(v, source, summary(v, { conciseSummary: "Fabricated claim", keyClaims: ["Fabricated claim"] })));
    expect(prompt).not.toContain("Fabricated claim");
    expect(prompt).not.toContain(source.focusDescription);
  });
  it("renders metadata-only days without an AI request or invented personal advice", async () => {
    const v = video({ transcriptText: null, transcriptStatus: "unavailable" });
    const result = await generateDailyReportMarkdown("2026-09-17", [{ video: v, source, summary: summary(v) }]);
    expect(JSON.stringify(result.structuredJson)).toContain("title-only preview");
    expect(result.fullMarkdown).not.toContain("Health");
    expect(result.fullMarkdown).not.toContain("preliminary");
  });
});
