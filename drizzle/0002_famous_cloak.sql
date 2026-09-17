CREATE TABLE IF NOT EXISTS "reader_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_states" (
	"video_id" uuid PRIMARY KEY NOT NULL,
	"saved" boolean DEFAULT false NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"less" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "story_states" ADD CONSTRAINT "story_states_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;