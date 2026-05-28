import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Database = NeonHttpDatabase<typeof schema>;

let db: Database | null = null;

// The Neon serverless HTTP driver only speaks to Neon's cloud endpoint. For
// local development against a standard PostgreSQL instance (e.g. localhost),
// fall back to the node-postgres driver so the same DATABASE_URL just works.
function isLocalDatabase(url: string) {
  return /@(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/)/.test(url);
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!db) {
    if (isLocalDatabase(url)) {
      db = drizzlePg(new Pool({ connectionString: url }), {
        schema,
      }) as unknown as Database;
    } else {
      db = drizzle(neon(url), { schema });
    }
  }

  return db;
}
