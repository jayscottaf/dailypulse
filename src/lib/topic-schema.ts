import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
let ready:Promise<void>|undefined;
export function ensureTopicSchema() {
  ready ??= (async()=>{
    for(const topic of ["technology","aviation","travel_points","local_business","home_design"]) await getDb().execute(sql.raw(`ALTER TYPE "public"."layer" ADD VALUE IF NOT EXISTS '${topic}'`));
  })().catch(error=>{ready=undefined;throw error;});
  return ready;
}
