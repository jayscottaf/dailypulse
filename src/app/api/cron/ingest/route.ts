import { validateCronSecret } from "@/lib/auth";
import { runIngestion } from "@/lib/ingestion";

export const maxDuration = 60;

// Feed collection runs separately from article extraction and summarization,
// which run during report generation within their own 60-second budget.
export async function GET(request: Request) {
  if (!validateCronSecret(request.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const ingestion = await runIngestion();
  return Response.json({ ok: true, ingestion });
}
