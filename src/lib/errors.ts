import { getDb } from "@/db/client";
import { errorLogs } from "@/db/schema";

export async function logError(
  context: string,
  error: unknown,
  metadata: Record<string, unknown> = {},
) {
  const normalized = error instanceof Error ? error : new Error(String(error));

  try {
    await getDb().insert(errorLogs).values({
      context,
      message: normalized.message,
      stack: normalized.stack,
      metadata,
    });
  } catch (loggingError) {
    console.error("Failed to persist error log", loggingError);
    console.error(context, normalized);
  }
}
