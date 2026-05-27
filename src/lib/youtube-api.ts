export async function lookupChannelIdByHandle(handle: string | null) {
  if (!process.env.YOUTUBE_API_KEY || !handle) return null;
  const normalized = handle.startsWith("@") ? handle : `@${handle}`;
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "id");
  url.searchParams.set("forHandle", normalized);
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY);

  const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
  if (!response.ok) return null;

  const payload = (await response.json()) as { items?: Array<{ id?: string }> };
  return payload.items?.[0]?.id ?? null;
}
