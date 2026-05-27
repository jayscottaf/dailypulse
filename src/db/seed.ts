import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { sources } from "./schema";
import { SOURCE_ROSTER, resolveRssUrl } from "../lib/source-roster";

async function main() {
  const db = getDb();

  for (const source of SOURCE_ROSTER) {
    const [existing] = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.displayName, source.displayName))
      .limit(1);

    const values = {
      ...source,
      rssUrl: resolveRssUrl(source),
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(sources).set(values).where(eq(sources.id, existing.id));
    } else {
      await db.insert(sources).values(values);
    }
  }

  console.log(`Seeded ${SOURCE_ROSTER.length} Daily Pulse sources.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
