"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateAdminSecret } from "@/lib/auth";

export async function loginAdmin(formData: FormData) {
  const secret = String(formData.get("secret") ?? "");
  if (!validateAdminSecret(secret)) {
    redirect("/admin?error=1");
  }

  const store = await cookies();
  store.set("daily_pulse_admin", secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/admin");
}
