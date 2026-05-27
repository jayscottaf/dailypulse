import { cookies } from "next/headers";

export async function isAdminSession() {
  const store = await cookies();
  return Boolean(process.env.ADMIN_SECRET && store.get("daily_pulse_admin")?.value === process.env.ADMIN_SECRET);
}
