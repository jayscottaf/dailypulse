import { createHash } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { privateNewsletters } from "@/db/schema";
import { isPrivateSession } from "@/lib/page-auth";
import { topicKeys } from "@/lib/topics";

const inputSchema = z.object({
  sender: z.string().trim().min(1).max(200),
  subject: z.string().trim().min(1).max(300),
  topic: z.enum(topicKeys),
  receivedAt: z.coerce.date().min(new Date("2000-01-01")),
  body: z.string().trim().min(20).max(50000),
});

let ready: Promise<void> | undefined;
async function authorizedDb() {
  if (!(await isPrivateSession())) throw new Error("Sign in to access private newsletters.");
  // Authorization precedes every database operation, including initialization.
  ready ??= getDb().execute(sql`CREATE TABLE IF NOT EXISTS private_newsletters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), fingerprint text NOT NULL UNIQUE,
    sender text NOT NULL, subject text NOT NULL, topic text NOT NULL,
    received_at timestamptz NOT NULL, body text NOT NULL,
    archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
  )`).then(() => {}).catch(error => { ready = undefined; throw error; });
  await ready;
  return getDb();
}

export async function listPrivateNewsletters(archived = false) {
  const db = await authorizedDb();
  return db.select().from(privateNewsletters).where(eq(privateNewsletters.archived, archived)).orderBy(desc(privateNewsletters.receivedAt)).limit(100);
}

export async function importPrivateNewsletter(input: unknown) {
  const db = await authorizedDb();
  const values = inputSchema.parse(input);
  if (values.receivedAt.getTime() > Date.now() + 86400000) throw new Error("Choose a date up to today.");
  const fingerprint = createHash("sha256").update(JSON.stringify([values.sender, values.subject, values.body])).digest("hex");
  const rows = await db.insert(privateNewsletters).values({ ...values, fingerprint }).onConflictDoNothing().returning({ id: privateNewsletters.id });
  return rows.length > 0;
}

export async function archivePrivateNewsletter(id: string, archived: boolean) {
  const db = await authorizedDb();
  await db.update(privateNewsletters).set({ archived }).where(eq(privateNewsletters.id, z.uuid().parse(id)));
}
