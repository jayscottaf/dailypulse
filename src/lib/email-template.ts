import type { DailyReport } from "@/db/schema";
import { appBaseUrl, emailFrom, emailTo } from "@/lib/config";
import { briefStories, parseBriefing, safeSourceUrl, TOPICS } from "@/lib/stories";
import { formatReportDate } from "@/lib/slug";

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function buildEmailPayload(report: DailyReport) {
  const briefing = parseBriefing(report.structuredJson);
  const stories = briefing ? briefStories(briefing) : [];
  const kind = briefing?.status === "source_error" ? "notice" : briefing?.status === "ready" && stories.length ? "briefing" : "skip";
  const reason = !briefing ? "This archived report needs regeneration before it can be emailed." : kind === "skip" ? briefing.message : "";
  const baseUrl = safeSourceUrl(appBaseUrl())?.replace(/\/$/, "") ?? "http://localhost:3000";
  const reportUrl = `${baseUrl}/daily-pulse/${encodeURIComponent(report.slug)}`;
  const subject = kind === "notice" ? "DailyPulse service notice: source checks need attention" : kind === "briefing" ? `DailyPulse: ${stories[0].headline.replace(/[\r\n]+/g, " ").slice(0, 100)}` : "DailyPulse: no briefing email today";
  const date = formatReportDate(report.date);
  const preheader = kind === "notice" ? "Today's briefing is on hold while source checks are incomplete." : `${stories.length} stories · ${date}`;
  const notice = "Source checks did not complete successfully or are out of date. Today's news email is on hold so missing updates are not mistaken for a quiet day. Check Pipeline & delivery for details.";
  const body = kind === "briefing" ? stories.map(story => {
    const links = story.sources.flatMap(source => {
      const url = safeSourceUrl(source.url);
      return url ? [`<a href="${escapeHtml(url)}" style="color:#76570d;text-decoration:underline">${escapeHtml(source.name)}</a>`] : [];
    });
    return `<tr><td style="padding:22px 0;border-bottom:1px solid #e5e3dc"><p style="margin:0 0 7px;font-size:12px;color:#706e65">${escapeHtml(TOPICS[story.topic])} · ${story.novelty === "updated" ? "Updated" : "New"} · From transcript</p><h2 style="margin:0 0 10px;font-size:20px;line-height:1.35;font-weight:600">${escapeHtml(story.headline)}</h2><p style="margin:0;font-size:16px;line-height:1.65">${escapeHtml(story.summary)}</p><p style="margin:12px 0 0;font-size:13px;line-height:1.5">${links.join(" · ")}</p></td></tr>`;
  }).join("") : `<tr><td style="padding:22px 0;font-size:16px;line-height:1.65">${escapeHtml(kind === "notice" ? notice : reason)}</td></tr>`;
  const footerUrl = `${baseUrl}/${kind === "notice" ? "admin" : "feed"}`;
  const footerText = kind === "notice" ? "Check pipeline & delivery" : "Explore your feed";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f7f6f2;color:#24251f;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px"><tr><td><p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;color:#76570d">DAILYPULSE${kind === "notice" ? " · SERVICE NOTICE" : ""}</p><h1 style="margin:0;font-size:26px;line-height:1.3">${kind === "notice" ? "Your briefing is on hold." : kind === "skip" ? "You're caught up." : "A few things worth knowing."}</h1><p style="margin:10px 0 0;font-size:13px;color:#706e65">${escapeHtml(date)}</p></td></tr>${body}<tr><td style="padding:26px 0;font-size:14px;line-height:1.7"><a href="${escapeHtml(footerUrl)}" style="color:#76570d;font-weight:600">${footerText} →</a>${kind === "briefing" ? `<p style="margin:12px 0 0;color:#706e65">Summaries preserve the source's claims and caveats. <a href="${escapeHtml(`${baseUrl}/settings`)}" style="color:#76570d">Tune your topics and briefing length</a>.</p>` : ""}</td></tr></table></td></tr></table></body></html>`;
  const text = kind === "briefing" ? ["DAILYPULSE", date, ...stories.map(story => `${TOPICS[story.topic]} · ${story.novelty === "updated" ? "Updated" : "New"} · From transcript\n${story.headline}\n${story.summary}\n${story.sources.flatMap(source => safeSourceUrl(source.url) ? [`${source.name}: ${safeSourceUrl(source.url)}`] : []).join("\n")}`), `${footerText}: ${footerUrl}`, `Reading preferences: ${baseUrl}/settings`].join("\n\n") : `DAILYPULSE${kind === "notice" ? " SERVICE NOTICE" : ""}\n${date}\n\n${kind === "notice" ? notice : reason}\n\n${footerText}: ${footerUrl}`;
  return { from: emailFrom(), to: emailTo(), subject, html, text, reportUrl, kind, reason, sendable: kind !== "skip" };
}
