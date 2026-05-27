import { requireAdminSecret } from "@/lib/auth";
import { bootstrapDatabase } from "@/lib/bootstrap-db";

export const maxDuration = 60;

export async function POST(request: Request) {
  const unauthorized = requireAdminSecret(request);
  if (unauthorized) return unauthorized;

  const result = await bootstrapDatabase();
  return Response.json({ ok: true, ...result });
}
