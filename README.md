# Jason Daily Pulse

Private daily intelligence dashboard for Jason Mergl. The app ingests a fixed roster of YouTube RSS sources, summarizes new videos with OpenAI, generates a daily personalized briefing, archives every report, and emails the landing page link through Resend.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- shadcn-style owned UI components
- PostgreSQL on Neon or Vercel Postgres
- Drizzle ORM and migrations
- OpenAI API for video summaries and daily report generation
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

`TRANSCRIPT_API_URL` is optional. If it is not configured, ingestion marks transcripts unavailable and summaries use title, description, and RSS metadata. Manual transcript paste/edit is available on each video detail page.

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

Vercel Cron calls `/api/cron/daily-pulse` in production. The route validates `Authorization: Bearer CRON_SECRET`, runs ingestion, generates the report, sends email, and returns JSON status.

## Report Flow

1. Ingestion fetches active source RSS feeds.
2. Videos are deduplicated by `youtubeVideoId`.
3. Transcript handling attempts the optional transcript service, otherwise falls back to metadata.
4. OpenAI creates one saved summary per new/changed video.
5. The daily report uses video summaries from the last 24-72 hours.
6. The final report is saved as markdown and structured JSON.
7. Resend emails Jason a short preview and full report link.

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
