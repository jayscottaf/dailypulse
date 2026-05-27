export type TranscriptResult =
  | { status: "available"; text: string }
  | { status: "unavailable"; text: null }
  | { status: "error"; text: null; error: string };

export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  const endpoint = process.env.TRANSCRIPT_API_URL;
  if (!endpoint) {
    return { status: "unavailable", text: null };
  }

  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/${videoId}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return { status: "unavailable", text: null };
    }

    const payload = (await response.json()) as { text?: string; transcript?: string };
    const text = payload.text || payload.transcript || "";

    if (!text.trim()) {
      return { status: "unavailable", text: null };
    }

    return { status: "available", text };
  } catch (error) {
    return {
      status: "error",
      text: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
