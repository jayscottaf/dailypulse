// Case-insensitive dedup: the model sometimes emits the same tag with
// different casing within one report/summary (e.g. "Tesla" and "tesla").
// Keeps the first-seen casing as the display form.
export function uniqueTags(tags: string[]) {
  const seen = new Map<string, string>();
  for (const raw of tags) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return [...seen.values()];
}

function queryHref(path: string, key: string, value: string) {
  const params = new URLSearchParams({ [key]: value });
  return `${path}?${params.toString()}`;
}

export function archiveTagHref(tag: string) {
  return queryHref("/archive", "tag", tag);
}

export function searchTagHref(tag: string) {
  return queryHref("/search", "q", tag);
}
