// Shared result shape + wrapper for server actions, so every mutating action in
// the app reports success/failure the same way and the UI can render consistent
// inline feedback (see components/app/action-status.tsx).

export type ActionResult = { ok: boolean; message: string };

export async function runAction(label: string, fn: () => Promise<string>): Promise<ActionResult> {
  try {
    return { ok: true, message: await fn() };
  } catch (error) {
    return { ok: false, message: `${label} failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}
