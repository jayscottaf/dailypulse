import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sources } from "@/db/schema";
import { SOURCE_ROSTER, resolveRssUrl } from "@/lib/source-roster";

const schemaStatements = [
  `DO $$ BEGIN CREATE TYPE "public"."layer" AS ENUM('macro_financial', 'deep_tech_ai', 'tesla_ownership'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "public"."transcript_status" AS ENUM('available', 'unavailable', 'manual', 'error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "daily_reports" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "date" date NOT NULL,
    "title" text NOT NULL,
    "slug" text NOT NULL,
    "summary_preview" text NOT NULL,
    "full_markdown" text NOT NULL,
    "structured_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "source_video_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "email_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "sources" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "display_name" text NOT NULL,
    "layer" "layer" NOT NULL,
    "youtube_channel_id" text,
    "youtube_handle" text,
    "rss_url" text,
    "focus_description" text NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "videos" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "source_id" uuid NOT NULL REFERENCES "public"."sources"("id") ON DELETE cascade,
    "youtube_video_id" text NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "url" text NOT NULL,
    "published_at" timestamp with time zone NOT NULL,
    "thumbnail_url" text,
    "transcript_status" "transcript_status" DEFAULT 'unavailable' NOT NULL,
    "transcript_text" text,
    "raw_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "video_summaries" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "video_id" uuid NOT NULL REFERENCES "public"."videos"("id") ON DELETE cascade,
    "concise_summary" text NOT NULL,
    "key_claims" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "important_data_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "quotes_or_paraphrases" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "relevance_score_for_jason" integer DEFAULT 0 NOT NULL,
    "action_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "model" text,
    "content_hash" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "report_videos" (
    "report_id" uuid NOT NULL REFERENCES "public"."daily_reports"("id") ON DELETE cascade,
    "video_id" uuid NOT NULL REFERENCES "public"."videos"("id") ON DELETE cascade,
    CONSTRAINT "report_videos_report_id_video_id_pk" PRIMARY KEY("report_id","video_id")
  )`,
  `CREATE TABLE IF NOT EXISTS "email_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "report_id" uuid REFERENCES "public"."daily_reports"("id") ON DELETE set null,
    "recipient" text NOT NULL,
    "subject" text NOT NULL,
    "provider_message_id" text,
    "status" text NOT NULL,
    "error_message" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "ingestion_runs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "started_at" timestamp with time zone DEFAULT now() NOT NULL,
    "finished_at" timestamp with time zone,
    "status" text NOT NULL,
    "videos_found" integer DEFAULT 0 NOT NULL,
    "videos_created" integer DEFAULT 0 NOT NULL,
    "videos_skipped" integer DEFAULT 0 NOT NULL,
    "error_message" text,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "error_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "context" text NOT NULL,
    "message" text NOT NULL,
    "stack" text,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "daily_reports_slug_unique" ON "daily_reports" USING btree ("slug")`,
  `CREATE INDEX IF NOT EXISTS "daily_reports_date_idx" ON "daily_reports" USING btree ("date")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "sources_display_name_unique" ON "sources" USING btree ("display_name")`,
  `CREATE INDEX IF NOT EXISTS "sources_layer_idx" ON "sources" USING btree ("layer")`,
  `CREATE INDEX IF NOT EXISTS "sources_active_idx" ON "sources" USING btree ("is_active")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "video_summaries_video_id_unique" ON "video_summaries" USING btree ("video_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "videos_youtube_video_id_unique" ON "videos" USING btree ("youtube_video_id")`,
  `CREATE INDEX IF NOT EXISTS "videos_source_idx" ON "videos" USING btree ("source_id")`,
  `CREATE INDEX IF NOT EXISTS "videos_published_idx" ON "videos" USING btree ("published_at")`,
  `CREATE INDEX IF NOT EXISTS "videos_search_idx" ON "videos" USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(transcript_text,'')))`,
  `CREATE INDEX IF NOT EXISTS "reports_search_idx" ON "daily_reports" USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary_preview,'') || ' ' || coalesce(full_markdown,'')))`,
  `CREATE INDEX IF NOT EXISTS "video_summaries_search_idx" ON "video_summaries" USING gin (to_tsvector('english', coalesce(concise_summary,'') || ' ' || coalesce(key_claims::text,'') || ' ' || coalesce(tags::text,'')))`,
];

export async function bootstrapDatabase() {
  const db = getDb();

  for (const statement of schemaStatements) {
    await db.execute(sql.raw(statement));
  }

  for (const source of SOURCE_ROSTER) {
    await db
      .insert(sources)
      .values({
        ...source,
        rssUrl: resolveRssUrl(source),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sources.displayName,
        set: {
          ...source,
          rssUrl: resolveRssUrl(source),
          updatedAt: new Date(),
        },
      });
  }

  return {
    schemaStatements: schemaStatements.length,
    sourcesSeeded: SOURCE_ROSTER.length,
  };
}
