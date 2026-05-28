export function uniqueTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
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
