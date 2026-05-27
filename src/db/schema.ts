import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const layerEnum = pgEnum("layer", [
  "macro_financial",
  "deep_tech_ai",
  "tesla_ownership",
]);

export const transcriptStatusEnum = pgEnum("transcript_status", [
  "available",
  "unavailable",
  "manual",
  "error",
]);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull(),
    layer: layerEnum("layer").notNull(),
    youtubeChannelId: text("youtube_channel_id"),
    youtubeHandle: text("youtube_handle"),
    rssUrl: text("rss_url"),
    focusDescription: text("focus_description").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    displayUnique: uniqueIndex("sources_display_name_unique").on(table.displayName),
    layerIdx: index("sources_layer_idx").on(table.layer),
    activeIdx: index("sources_active_idx").on(table.isActive),
  }),
);

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    youtubeVideoId: text("youtube_video_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    thumbnailUrl: text("thumbnail_url"),
    transcriptStatus: transcriptStatusEnum("transcript_status").default("unavailable").notNull(),
    transcriptText: text("transcript_text"),
    rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    youtubeVideoIdUnique: uniqueIndex("videos_youtube_video_id_unique").on(table.youtubeVideoId),
    sourceIdx: index("videos_source_idx").on(table.sourceId),
    publishedIdx: index("videos_published_idx").on(table.publishedAt),
  }),
);

export const videoSummaries = pgTable(
  "video_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    conciseSummary: text("concise_summary").notNull(),
    keyClaims: jsonb("key_claims").$type<string[]>().default([]).notNull(),
    importantDataPoints: jsonb("important_data_points").$type<string[]>().default([]).notNull(),
    quotesOrParaphrases: jsonb("quotes_or_paraphrases").$type<string[]>().default([]).notNull(),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    relevanceScoreForJason: integer("relevance_score_for_jason").default(0).notNull(),
    actionSignals: jsonb("action_signals").$type<string[]>().default([]).notNull(),
    model: text("model"),
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    videoUnique: uniqueIndex("video_summaries_video_id_unique").on(table.videoId),
  }),
);

export const dailyReports = pgTable(
  "daily_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summaryPreview: text("summary_preview").notNull(),
    fullMarkdown: text("full_markdown").notNull(),
    structuredJson: jsonb("structured_json").$type<Record<string, unknown>>().default({}).notNull(),
    sourceVideoIds: jsonb("source_video_ids").$type<string[]>().default([]).notNull(),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("daily_reports_slug_unique").on(table.slug),
    dateIdx: index("daily_reports_date_idx").on(table.date),
  }),
);

export const reportVideos = pgTable(
  "report_videos",
  {
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.reportId, table.videoId] }),
  }),
);

export const emailLogs = pgTable("email_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").references(() => dailyReports.id, { onDelete: "set null" }),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  providerMessageId: text("provider_message_id"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull(),
  videosFound: integer("videos_found").default(0).notNull(),
  videosCreated: integer("videos_created").default(0).notNull(),
  videosSkipped: integer("videos_skipped").default(0).notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
});

export const errorLogs = pgTable("error_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  context: text("context").notNull(),
  message: text("message").notNull(),
  stack: text("stack"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Source = typeof sources.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type VideoSummary = typeof videoSummaries.$inferSelect;
export type DailyReport = typeof dailyReports.$inferSelect;
