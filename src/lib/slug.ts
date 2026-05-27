export function createReportSlug(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  const iso = date.toISOString().slice(0, 10);
  return `daily-pulse-${iso}`;
}

export function formatReportDate(input: Date | string) {
  const date = typeof input === "string" ? new Date(`${input}T12:00:00Z`) : input;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
