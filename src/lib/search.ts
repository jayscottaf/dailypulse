import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export type SearchResult = {
  type: "report" | "video" | "source";
  id: string;
  title: string;
  snippet: string;
  date: string | null;
  href: string;
};

export function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

export async function searchAll(query: string): Promise<SearchResult[]> {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];

  const db = getDb();
  const rows = await db.execute(sql`
    WITH q AS (SELECT plainto_tsquery('english', ${normalized}) AS query)
    SELECT 'report' AS type, id::text, title,
      ts_headline('english', full_markdown, q.query, 'MaxWords=24, MinWords=8') AS snippet,
      date::text AS date,
      '/daily-pulse/' || slug AS href,
      ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary_preview,'') || ' ' || coalesce(full_markdown,'')), q.query) AS rank
    FROM daily_reports, q
    WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary_preview,'') || ' ' || coalesce(full_markdown,'')) @@ q.query
    UNION ALL
    SELECT 'video' AS type, videos.id::text, videos.title,
      ts_headline('english', coalesce(videos.description,'') || ' ' || coalesce(video_summaries.concise_summary,'') || ' ' || coalesce(videos.transcript_text,''), q.query, 'MaxWords=24, MinWords=8') AS snippet,
      videos.published_at::date::text AS date,
      '/videos/' || videos.id::text AS href,
      ts_rank(to_tsvector('english', coalesce(videos.title,'') || ' ' || coalesce(videos.description,'') || ' ' || coalesce(video_summaries.concise_summary,'') || ' ' || coalesce(videos.transcript_text,'')), q.query) AS rank
    FROM videos
    LEFT JOIN video_summaries ON video_summaries.video_id = videos.id, q
    WHERE to_tsvector('english', coalesce(videos.title,'') || ' ' || coalesce(videos.description,'') || ' ' || coalesce(video_summaries.concise_summary,'') || ' ' || coalesce(videos.transcript_text,'')) @@ q.query
    UNION ALL
    SELECT 'source' AS type, id::text, display_name AS title,
      focus_description AS snippet,
      NULL AS date,
      '/sources#' || id::text AS href,
      0.05 AS rank
    FROM sources, q
    WHERE to_tsvector('english', coalesce(display_name,'') || ' ' || coalesce(focus_description,'') || ' ' || coalesce(youtube_handle,'')) @@ q.query
    ORDER BY rank DESC
    LIMIT 50
  `);

  return rows as unknown as SearchResult[];
}
