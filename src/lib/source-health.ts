export function sourceChecksIncomplete(run: { status: string; finishedAt: Date | null } | null | undefined, now = new Date()) {
  return !run || run.status !== "success" || !run.finishedAt || now.getTime() - run.finishedAt.getTime() > 26 * 60 * 60 * 1000;
}
