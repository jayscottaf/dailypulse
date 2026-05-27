export function validateAdminSecret(secret: string | null | undefined) {
  return Boolean(process.env.ADMIN_SECRET && secret === process.env.ADMIN_SECRET);
}

export function validateCronSecret(authHeader: string | null) {
  if (!process.env.CRON_SECRET) return false;
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export function requireAdminSecret(request: Request) {
  const headerSecret = request.headers.get("x-admin-secret");
  const querySecret = new URL(request.url).searchParams.get("secret");

  if (!validateAdminSecret(headerSecret) && !validateAdminSecret(querySecret)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
