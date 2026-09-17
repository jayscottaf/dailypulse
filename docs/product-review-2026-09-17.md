# DailyPulse product review — September 17, 2026

Recommended direction: a two-minute daily briefing followed by a visual, filterable feed. Keep DailyPulse's existing storage and ingestion initially; replace the information structure, ranking, and reading interface. The user selected both a short briefing and a visual news feed.

## Evidence and scope

Reviewed local source code and the deployed September 16 and 17 reports, an older July 2 report, and the source detail for Iowa Tesla Guy's FSD 14.3.9 video. The deployment was located through GitHub's successful Production deployment record, ID 5295180752. Its URL is https://dailypulse-4y5ug48x0-jayscottaf-gmailcoms-projects.vercel.app/ . This is a deployment URL, not a verified current custom domain.

The local app starts and displays its setup screen without a framework error overlay; local database and transcript-service settings are empty. Production source detail was readable. No reports were regenerated, preferences changed, emails sent, or application code modified. Individual news claims were not independently fact-checked.

## What is making the app hard to use

1. **The first screen postpones the useful content.** At the inspected desktop viewport, the large title, prose preview, tags, duplicate Archive/Search links, section jump links, and date navigation occupy almost the whole screen. The story list starts below them. All subsequent bullets have similar visual weight. There are no story headlines, thumbnail cards, or collapsed detail views in the report renderer.

2. **The template produces filler.** `src/lib/ai.ts:195` requires four fixed sections and eleven subsections, including health, taxes, projects, vehicle ownership, and a daily priority. The September 17 report includes generic hydration and portfolio advice; July 2 invents relevance to logistics and commercial vehicle operations. These personal assumptions are not established by the profile passed in this code. Make such advice optional and dependent on explicit personal context and evidence.

3. **Uncertainty becomes certainty.** The FSD source detail explicitly shows an unavailable transcript. Its summary says the update “likely includes” stress-test changes. The September 17 briefing presents stress-test and seasonal battery improvements as established features and recommends updating vehicles. The channel focus description also includes stress testing and seasonal battery performance, suggesting possible contamination from channel metadata; that mechanism is an inference, not proven. `src/lib/ai.ts` permits title/description/source-focus summaries, and the output schema does not retain a confidence or evidence-basis field. Preserve attribution and uncertainty through every generation stage. A source link alone is not verification.

4. **Old stories are repackaged as today's news.** The September 16 and 17 reports repeat the same Sven Carlin video, Tesla model-launch video, and FSD video without a clear new-development marker. `src/lib/reports.ts` requests a 72-hour source window; `src/lib/ingestion.ts` orders candidates by publication time. The prompt receives neither the previous report nor previously covered claims. Add stable story identities, covered-through tracking, and explicit New / Updated / Previously covered labels.

5. **Personalization has no current input controls.** Feedback storage and `saveReportFeedback` exist, and `/liked` displays historical feedback. The report page imports neither feedback state nor voting controls. Put Save, Less like this, and Hide source next to stories. Keep saving separate from preference training; distinguish “I already know this” from “I dislike this topic.”

6. **Navigation reflects administration.** Admin is the first navigation item; Today is available only through the brand link. Use Today, Feed, Saved, and Search, with Sources and pipeline operations under Settings. Keep source evidence in a reading panel; move transcript editing into an explicit editing control.

7. **A possible stale-home issue deserves a separate check.** Opening the deployment root landed on July 2 while that report's Latest link correctly led to September 17. The cause could involve cached routing or deployed-version differences. Verify on the canonical production URL before diagnosing a cache bug.

## Proposed reading experience

- **Brief:** Three to five genuinely new stories, each with a clear headline and one or two sentences. Aim for roughly 150–250 words. Omit empty topics and routine lifestyle advice. A quiet day should produce a short briefing.
- **Feed:** Visual cards with source, publication date, thumbnail where available, short summary, evidence basis, and New/Updated status. Start with All, AI & tools, Tesla, and Money filters; make topics editable.
- **Detail:** Expand into what happened, source evidence, relevant caveats, and a watch/read link. Show timestamps only when supported by the source. Personal implications should be optional and grounded in an explicit profile.
- **Feedback:** Save, less like this, already read, and source controls. Show a brief reason for selection when useful, rather than an unexplained relevance score.
- **Reading controls:** Brief/list/card modes, comfortable text width, light/dark appearance, compact mobile navigation, and a visible freshness timestamp.

## Open-source shortlist

These are evaluated candidates, not applications installed and tested in this workspace.

| Project | Useful parts | Reuse and migration assessment |
| --- | --- | --- |
| [Folo](https://github.com/RSSNext/Folo) | Unified reader, multiple media types, summaries, feed/list organization | Strong browsing reference. Large client codebase; not a drop-in Next.js page. AGPL-3.0, with an explicit non-redistributable `icons/mgc` exception. Do not copy its icon directory. Validate service dependencies before a full fork. |
| [NewsBlur](https://github.com/samuelclay/NewsBlur) | Preference training, saved stories, clustering, configurable briefings, bullet/headline/editorial formats | Most complete alternative to evaluate if replacing the whole product. MIT code is reusable with required notices. Its Python-based, multi-service architecture makes a full migration considerably larger than improving DailyPulse. |
| [Cruxwire](https://github.com/philoking/cruxwire) | Ranked magazine feed, cross-source clustering, editable interests, read-later state | Closest small visual-digest donor. MIT. Python/vanilla JS with Ollama; would require adapting the pipeline and UI to DailyPulse's stack. Very small project (7 GitHub stars at review), not a proven wholesale replacement. Its README says there is no login and it is intended for private-network use. |
| [Glance](https://github.com/glanceapp/glance) | Compact RSS and YouTube widgets, customizable layouts and themes | Good dashboard reference, but the documented feature set does not replace the personalized briefing engine. Go/YAML deployment model and AGPL-3.0. |

Primary references: [NewsBlur briefing behavior](https://forum.newsblur.com/t/daily-briefing-a-personalized-summary-of-your-news-delivered-on-your-schedule/13538), [NewsBlur license](https://raw.githubusercontent.com/samuelclay/NewsBlur/main/LICENSE.md), [Cruxwire license](https://raw.githubusercontent.com/philoking/cruxwire/main/LICENSE), and each project's repository README. Retain applicable license and copyright notices for reused code; handle AGPL requirements before distributing or hosting a modified fork for others.

## Recommended sequence

1. Correct the source-to-summary contract: structured evidence basis, uncertainty, attribution, and no prescriptive recommendations from metadata-only inputs. Show existing weak summaries as limited previews until regenerated from adequate evidence.
2. Add a story-oriented structure: headline, short summary, topic, evidence references, publication date, and novelty state. Keep old report rendering compatible with archived reports.
3. Build Today with a short brief and visual feed; bring item feedback back into the reading flow. Replace the rigid eleven-subsection prompt.
4. Add cross-day and cross-source deduplication, then editable interests and reading preferences. Use deterministic seen-source checks before introducing embedding clustering.
5. Consider broader RSS/official-source ingestion after the core reading flow is useful. Adding more feeds before improving ranking will increase noise.

Acceptance checks: important headlines appear in the first viewport; a reader can catch up in two minutes; one source does not appear as several separate stories; yesterday's stories are hidden or labeled unless materially updated; missing transcripts are visible; uncertainty survives into the brief; saving and feedback work independently; mobile cards and reading details are easy to use. Compare the redesigned version against the same source set before deciding on a full migration.

## Implementation and validation

The review above records the original behavior. The authorized redesign was implemented in five separately tested and pushed fixes: source evidence, ranked briefings and coverage tracking, the brief/feed interface, reading state and preferences, and email delivery.

Final validation: 34 tests passed, including disposable PostgreSQL-compatible database tests for independent reading state, provider rejection/retry behavior, quiet-day suppression, service-notice suppression, and recovery of missed feed updates. Resend and external feed calls were mocked in integration tests; no real test email was sent. ESLint, TypeScript and the production build passed. Browser checks covered topic filters, source details, Save/Read persistence, preference saving, and desktop/mobile layouts including the email preview.

Production verification confirmed that the home page opens the latest report and the new reading interface loads against existing data. Current inspected videos have unavailable transcripts, so they correctly show title-only previews. A substantive briefing email requires new transcript-backed summaries. Existing archived reports remain available under a collapsed caution label.
