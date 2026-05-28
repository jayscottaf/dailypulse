export type TimelineLink = {
  label: string;
  seconds: number;
  href: string;
  context: string;
};

function timestampToSeconds(value: string) {
  const parts = value.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function videoUrlAtTime(url: string, seconds: number) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("t", `${seconds}s`);
    return parsed.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}t=${seconds}s`;
  }
}

export function extractTimelineLinks(input: {
  videoUrl: string;
  transcriptText?: string | null;
  description?: string | null;
  limit?: number;
}) {
  const text = [input.description, input.transcriptText].filter(Boolean).join("\n");
  const limit = input.limit ?? 24;
  const lines = text.split(/\r?\n/);
  const links: TimelineLink[] = [];
  const seen = new Set<number>();
  const timestampPattern = /\b(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\b/g;

  for (const line of lines) {
    if (links.length >= limit) break;
    timestampPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = timestampPattern.exec(line)) && links.length < limit) {
      const label = match[0];
      const seconds = timestampToSeconds(label);
      if (seconds === null || seen.has(seconds)) continue;
      seen.add(seconds);
      links.push({
        label,
        seconds,
        href: videoUrlAtTime(input.videoUrl, seconds),
        context: line.replace(/\s+/g, " ").trim().slice(0, 180),
      });
    }
  }

  return links.sort((a, b) => a.seconds - b.seconds);
}
