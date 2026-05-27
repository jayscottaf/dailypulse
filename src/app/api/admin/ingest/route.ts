import { requireAdminSecret } from "@/lib/auth";
import { runIngestion } from "@/lib/ingestion";

export async function POST(request: Request) {
  const unauthorized = requireAdminSecret(request);
  if (unauthorized) return unauthorized;

  const result = await runIngestion();
  return Response.json(result);
}
