export const APP_NAME = "Jason Daily Pulse";
export const JASON_EMAIL = "jayscottaf@gmail.com";

export function appBaseUrl() {
  return process.env.APP_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export function emailTo() {
  return process.env.EMAIL_TO || JASON_EMAIL;
}

export function emailFrom() {
  return process.env.EMAIL_FROM || "Jason Daily Pulse <daily-pulse@example.com>";
}
