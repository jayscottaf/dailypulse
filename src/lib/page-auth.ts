import { cookies } from "next/headers";

// Admin sign-in is intentionally disabled by default. This is a private,
// single-user app with no sensitive data, so every page and in-app action is
// open and no login is required. To re-enable the cookie gate, set the env var
// ADMIN_AUTH_ENABLED=true (the secret-based check below then applies again).
//
// Note: this only governs the in-app UI / server actions. The /api/admin/*
// HTTP endpoints remain protected by their own ADMIN_SECRET header check, and
// the cron routes by CRON_SECRET, so cost/email triggers can't be scripted
// anonymously.
export async function isAdminSession() {
  if (process.env.ADMIN_AUTH_ENABLED !== "true") return true;

  const store = await cookies();
  return Boolean(process.env.ADMIN_SECRET && store.get("daily_pulse_admin")?.value === process.env.ADMIN_SECRET);
}
