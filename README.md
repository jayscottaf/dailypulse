# Jason Daily Pulse

Daily intelligence dashboard for Jason Mergl. The app collects YouTube, RSS/Atom news and forum posts, summarizes available source text, and delivers a brief of 3–5 stories. Private newsletter excerpts have a separate sign-in-protected inbox.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- shadcn-style owned UI components
- PostgreSQL on Neon or Vercel Postgres
- Drizzle ORM and migrations
- OpenAI API for transcript-backed video summaries
- Resend for email delivery
- Vercel Cron Jobs for the daily pipeline

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
DATABASE_URL=
OPENAI_API_KEY=
RESEND_API_KEY=
ADMIN_SECRET=
CRON_SECRET=
APP_BASE_URL=http://localhost:3000
EMAIL_TO=jayscottaf@gmail.com
EMAIL_FROM="Jason Daily Pulse <daily-pulse@example.com>"
YOUTUBE_API_KEY=
```

`TRANSCRIPT_API_URL` is optional. If it is not configured, ingestion marks transcripts unavailable and items show title-only previews until source text is available. Manual transcript paste/edit is available on each video detail page.

## Local Setup

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000/admin`, enter `ADMIN_SECRET`, then use the dashboard buttons to run ingestion, generate today’s report, and send email.

## Database

The initial migration creates:

- `sources`
- `videos`
- `video_summaries`
- `daily_reports`
- `report_videos`
- `email_logs`
- `ingestion_runs`
- `error_logs`

Search uses PostgreSQL full-text indexes across reports, videos, summaries, transcripts, tags, and source metadata.

## Source Setup

The seed command inserts Jason’s source roster with channel names, layers, handles, focus descriptions, and active status. Exact YouTube channel IDs are intentionally nullable so the app can run before every ID is confirmed.

To enable RSS ingestion for a source:

1. Open `/sources`.
2. Add the source’s YouTube channel ID.
3. Save the source.
4. The RSS URL is generated as `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID` unless you provide a custom RSS URL.

The app does not scrape YouTube pages. `YOUTUBE_API_KEY` is reserved for later metadata lookup fallback.

## Manual Operations

Admin API routes require `ADMIN_SECRET` through the `x-admin-secret` header or `?secret=` query string.

```bash
curl -X POST "http://localhost:3000/api/admin/ingest?secret=$ADMIN_SECRET"
curl -X POST "http://localhost:3000/api/admin/generate-report?secret=$ADMIN_SECRET"
curl -X POST "http://localhost:3000/api/admin/send-email?secret=$ADMIN_SECRET"
```

The admin UI exposes the same operations:

- Run ingestion now
- Generate today’s report
- Send today’s email
- Rebuild search index

## Vercel Deployment

1. Create a Vercel project connected to this repository.
2. Provision Neon or Vercel Postgres and set `DATABASE_URL`.
3. Set all required environment variables in Vercel.
4. Deploy.
5. Run migrations against the production database:

```bash
npm run db:migrate
npm run db:seed
```

`vercel.json` configures the daily cron route:

```json
{
  "path": "/api/cron/daily-pulse",
  "schedule": "0 11 * * *"
}
```

Vercel Cron runs `/api/cron/ingest` at 11:00 UTC and `/api/cron/report` at 11:20 UTC. Both validate `Authorization: Bearer CRON_SECRET`. The report job generates the briefing and evaluates whether an email should be sent. The combined `/api/cron/daily-pulse` endpoint remains available for manual use.

## Report Flow

1. Ingestion fetches active source RSS feeds.
2. Videos are deduplicated by `youtubeVideoId`.
3. Transcript handling attempts the optional transcript service. Without a transcript, the video remains a clearly labeled title preview.
4. OpenAI creates a saved summary from available transcripts, preserving attribution and uncertainty. Metadata previews do not invoke the model.
5. The daily brief deterministically selects up to three or five new or updated stories from a 72-hour window, using prior coverage and reading preferences.
6. The final report is saved as markdown and structured JSON.
7. Resend emails the selected source-backed stories in HTML and plain text, preserving the same summaries and source links. Quiet, metadata-only and already-covered briefings are skipped. Incomplete or stale source checks add a coverage warning when useful stories remain. If no grounded stories remain, a separate service notice is sent once per interruption until recovery.

## Routes

- `/` redirects to the latest report or shows a first-run dashboard link.
- `/admin` is protected by the admin secret cookie gate.
- `/daily-pulse/[slug]` displays the public report landing page.
- `/archive` is protected and filterable.
- `/search` is protected and uses PostgreSQL full-text search.
- `/sources` is protected source management.
- `/videos/[id]` is protected video detail and manual transcript editing.

## Tests

```bash
npm test
npm run lint
npm run build
```

Covered utility boundaries:

- RSS date filtering
- report slug creation
- search query normalization
- email payload creation
- cron secret validation

## Known Limitations

- YouTube transcripts may not always be available.
- Some videos may be summarized from metadata only.
- RSS gives recent uploads but not deep historical search.
- YouTube Data API should be used sparingly because of quota.
- This is a private single-user MVP, not a multi-user SaaS yet.
- Vector embeddings are not included in the MVP; the schema and search layer can be extended later.


### Reading and email previews

Today offers a short brief followed by a topic-filtered card/list feed. Saved bookmarks, read state and “less like this” feedback are independent. Settings controls topics, interests, muted sources, brief length, layout and appearance. Preferences affect the next generated briefing and email; they do not rewrite archived summaries.

`/email-preview` renders the latest report's email and plain-text version without sending. A production send requires a public HTTPS `APP_BASE_URL`. Provider acceptance is recorded only after Resend returns an ID; errors remain retryable. A deterministic content-based idempotency key guards retries within Resend's deduplication window. The app also skips reports with an existing `emailSentAt`.

Optional integration tests use a disposable local PostgreSQL-compatible database at `127.0.0.1:55432` only. Initialize it with `bootstrapDatabase`, run `scripts/seed-browser-test.ts`, then run `RUN_DB_TESTS=1 npm test` with `DATABASE_URL` set. Email and feed integrations mock external providers and send no real messages.

### News, forums and private newsletters

`/sources` offers 11 recommended public feeds: OpenAI, Hugging Face, Verge AI, Ars Technica, Hacker News, Not a Tesla App, Tesla Motors Club Model Y, Delta News Hub, FAA, Frequent Miler and Saratoga Today Business. Blender is optional. Installing a selection is repeat-safe and enables its topics without replacing other preferences. Electrek was left out because its hostname failed public-network validation during verification.

Collection checks a seven-day window. Article extraction and up to four publisher-balanced summaries run during report generation. AI, technology and Tesla each get a candidate when available. RSS entries without trustworthy dates are skipped. HTML becomes plain text; excerpts and forum accounts retain evidence labels. Link-only Hacker News entries stay discovery previews, outside the factual email brief. Mozilla Readability extracts publisher-owned article text when RSS excerpts are short; private addresses, non-HTTPS URLs and declared subscription-only pages are rejected.

`/newsletters` always requires `ADMIN_SECRET`, even when `ADMIN_AUTH_ENABLED=false`. Its table is separate from public sources, search, reports and email. Users can paste selected excerpts, archive/restore them and lock the inbox. Text is rendered escaped; it is not sent to OpenAI. All private reads and writes recheck the session before accessing the database. No real mailbox content is used in automated tests.

**Gmail is not connected to the deployed application.** A Gmail connector available inside Codex does not grant DailyPulse mailbox access. This version provides manual private import; automatic newsletter sync requires a separate read-only OAuth integration and explicit account connection.

New tables and topic enum values initialize additively on authorized use; matching Drizzle migrations are included. Test database integration with `RUN_DB_TESTS=1` only against the disposable PostgreSQL-compatible server at `127.0.0.1:55432`.
