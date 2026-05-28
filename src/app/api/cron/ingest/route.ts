import { validateCronSecret } from "@/lib/auth";
import { runIngestion } from "@/lib/ingestion";

export const maxDuration = 60;

// Split out from the original combined daily-pulse cron: on the Vercel Hobby
// plan a single invocation is capped at 60s, and ingest + summarize + report +
// email together exceeds that and times out (5XX). This route only ingests and
// summarizes; report generation + email run in a separate cron a few minutes
// later so each invocation stays under the limit.
export async function GET(request: Request) {
  if (!validateCronSecret(request.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ingestion = await runIngestion();
  return Response.json({ ok: true, ingestion });
}
