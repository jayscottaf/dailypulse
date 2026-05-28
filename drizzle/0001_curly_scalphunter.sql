DO $$ BEGIN CREATE TYPE "public"."feedback_vote" AS ENUM('up', 'down'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"item_fingerprint" text NOT NULL,
	"vote" "feedback_vote" NOT NULL,
	"item_text" text NOT NULL,
	"section_title" text NOT NULL,
	"subsection_title" text NOT NULL,
	"source_video_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "report_feedback" ADD CONSTRAINT "report_feedback_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "report_feedback_report_item_unique" ON "report_feedback" USING btree ("report_id","item_fingerprint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_feedback_vote_idx" ON "report_feedback" USING btree ("vote");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_feedback_updated_idx" ON "report_feedback" USING btree ("updated_at");
