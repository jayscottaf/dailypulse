CREATE TABLE IF NOT EXISTS "private_newsletters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" text NOT NULL,
	"sender" text NOT NULL,
	"subject" text NOT NULL,
	"topic" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"body" text NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "private_newsletters_fingerprint_unique" UNIQUE("fingerprint")
);
