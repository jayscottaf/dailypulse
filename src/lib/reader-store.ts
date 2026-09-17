import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { readerPreferences, storyStates, videos } from "@/db/schema";
import { preferencesSchema, type ReaderContext, type ReaderPreferences, type ReadingState } from "@/lib/reader-preferences";

let schemaReady: Promise<void> | undefined;
// Additive, idempotent initialization keeps git deployments compatible with existing databases.
// The same statements are recorded in the Drizzle migration for fresh installations.
export function ensureReaderSchema() {
  schemaReady ??= (async () => {
    await getDb().execute(sql`CREATE TABLE IF NOT EXISTS reader_preferences (id text PRIMARY KEY, settings jsonb NOT NULL DEFAULT '{}'::jsonb)`);
    await getDb().execute(sql`CREATE TABLE IF NOT EXISTS story_states (video_id uuid PRIMARY KEY CONSTRAINT story_states_video_id_videos_id_fk REFERENCES videos(id) ON DELETE CASCADE, saved boolean NOT NULL DEFAULT false, read boolean NOT NULL DEFAULT false, less boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now())`);
  })().catch(error => { schemaReady = undefined; throw error; });
  return schemaReady;
}

export async function readerContext(): Promise<ReaderContext> {
  await ensureReaderSchema();
  const [[settings], states] = await Promise.all([
    getDb().select().from(readerPreferences).where(eq(readerPreferences.id, "default")),
    getDb().select({ state: storyStates, sourceId: videos.sourceId }).from(storyStates).innerJoin(videos, eq(storyStates.videoId, videos.id)),
  ]);
  return {
    preferences: preferencesSchema.parse(settings?.settings ?? {}),
    states: Object.fromEntries(states.map(({ state }) => [state.videoId, { saved: state.saved, read: state.read, less: state.less }])),
    lessSourceIds: [...new Set(states.filter(({ state }) => state.less).map(({ sourceId }) => sourceId))],
  };
}

export async function setReadingState(videoId: string, field: keyof ReadingState, value: boolean) {
  await ensureReaderSchema();
  const [row] = await getDb().insert(storyStates).values({ videoId, [field]: value }).onConflictDoUpdate({ target: storyStates.videoId, set: { [field]: value, updatedAt: new Date() } }).returning();
  return { saved: row.saved, read: row.read, less: row.less };
}

export async function setReaderPreferences(preferences: ReaderPreferences) {
  await ensureReaderSchema();
  const settings = preferencesSchema.parse(preferences);
  await getDb().insert(readerPreferences).values({ id: "default", settings }).onConflictDoUpdate({ target: readerPreferences.id, set: { settings } });
}
