import { getDb } from "@/db/client";
import { sources } from "@/db/schema";
import { catalogSelection } from "@/lib/source-catalog";
import { ensureTopicSchema } from "@/lib/topic-schema";
import { readerContext, setReaderPreferences } from "@/lib/reader-store";

export async function installSources(keys: string[]) {
  const selected = catalogSelection(keys);
  await ensureTopicSchema();
  const existing = await getDb().select({ rssUrl: sources.rssUrl }).from(sources);
  const toAdd = selected.filter(source => !existing.some(row => row.rssUrl === source.rssUrl));
  const added = toAdd.length ? await getDb().insert(sources).values(toAdd.map(source => ({
    displayName: source.displayName, layer: source.layer, rssUrl: source.rssUrl, focusDescription: source.focusDescription,
  }))).onConflictDoNothing().returning({ id: sources.id }) : [];
  const reader = await readerContext();
  await setReaderPreferences({ ...reader.preferences, topics: [...new Set([...reader.preferences.topics, ...selected.map(source => source.layer)])] });
  return added.length;
}
