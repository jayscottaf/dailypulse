import type { Source } from "@/db/schema";

export const LAYERS = {
  macro_financial: "THE MACRO FINANCIAL LAYER",
  deep_tech_ai: "THE DEEP-TECH & AI AUTOMATION LAYER",
  tesla_ownership: "THE TESLA OWNERSHIP & SOFTWARE LAYER",
} as const;

export type LayerKey = keyof typeof LAYERS;

export type SeedSource = Pick<
  Source,
  "displayName" | "layer" | "youtubeChannelId" | "youtubeHandle" | "rssUrl" | "focusDescription" | "isActive"
>;

export const SOURCE_ROSTER: SeedSource[] = [
  {
    displayName: "Joseph Carlson / The Joseph Carlson Show",
    layer: "macro_financial",
    youtubeChannelId: "UCbta0n8i6Rljh0obO7HzG9A",
    youtubeHandle: "@josephcarlsonshow",
    rssUrl: null,
    focusDescription:
      "Corporate fundamental analysis, cash-flow compounders, net income margins, portfolio building.",
    isActive: true,
  },
  {
    displayName: "Sven Carlin / Sven Carlin - Value Investing",
    layer: "macro_financial",
    youtubeChannelId: "UCrTTBSUr0zhPU56UQljag5A",
    youtubeHandle: "@Value-Investing",
    rssUrl: null,
    focusDescription:
      "Pure value investing, debt maturities, margin-of-safety defenses, cyclical risk management.",
    isActive: true,
  },
  {
    displayName: "Alfonso Peccatiello / The Macro Compass",
    layer: "macro_financial",
    youtubeChannelId: "UCFk1qCySNf2FIzIidVVW81A",
    youtubeHandle: "@TheMacroCompass",
    rssUrl: null,
    focusDescription:
      "Global liquidity tracking, bond yields, credit impulses, macroeconomic market cycles.",
    isActive: true,
  },
  {
    displayName: "Patrick Boyle / Patrick Boyle on Finance",
    layer: "macro_financial",
    youtubeChannelId: "UCASM0cgfkJxQ1ICmRilfHLw",
    youtubeHandle: "@PBoyle",
    rssUrl: null,
    focusDescription:
      "Quantitative market realities, financial history, banking infrastructure, institutional capital tracking.",
    isActive: true,
  },
  {
    displayName: "AI Explained",
    layer: "deep_tech_ai",
    youtubeChannelId: "UCNJ1Ymd5yFuUPtn21xtRbbw",
    youtubeHandle: "@aiexplained-official",
    rssUrl: null,
    focusDescription:
      "Metric-first engineering audits, model capability benchmarks, context windows, core architecture shifts.",
    isActive: true,
  },
  {
    displayName: "The AI Daily Brief / Nathaniel Whittemore",
    layer: "deep_tech_ai",
    youtubeChannelId: "UCKelCK4ZaO6HeEI1KQjqzWA",
    youtubeHandle: "@AIDailyBrief",
    rssUrl: null,
    focusDescription:
      "High-tempo daily news, regulatory filings, compute hardware updates, AI geopolitics.",
    isActive: true,
  },
  {
    displayName: "Matt Wolfe",
    layer: "deep_tech_ai",
    youtubeChannelId: "UChpleBmo18P08aKCIgti38g",
    youtubeHandle: "@mreflow",
    rssUrl: null,
    focusDescription:
      "Practical workflow automation, no-code integrations, multi-agent loops, active tool deployment.",
    isActive: true,
  },
  {
    displayName: "AI Revolution / @airevolutionx",
    layer: "deep_tech_ai",
    youtubeChannelId: "UC5l7RouTQ60oUjLjt1Nh-UQ",
    youtubeHandle: "@airevolutionx",
    rssUrl: null,
    focusDescription:
      "High-production cinematic editorial documentaries tracking open-source model wars, physical robotics, macro structural shifts.",
    isActive: true,
  },
  {
    displayName: "ColdFusion",
    layer: "deep_tech_ai",
    youtubeChannelId: "UC4QZ_LsYcvcq7qOsOhpAX4A",
    youtubeHandle: "@ColdFusion",
    rssUrl: null,
    focusDescription:
      "Long-form tech journalism, corporate chaos histories, systemic technology case studies.",
    isActive: true,
  },
  {
    displayName: "Wes Roth",
    layer: "deep_tech_ai",
    youtubeChannelId: "UCqcbQf6yw5KzRoDDcZ_wBSw",
    youtubeHandle: "@WesRoth",
    rssUrl: null,
    focusDescription:
      "Macroscopic AI trend analysis and the intersection of AI with sovereign militaries and global banking systems.",
    isActive: true,
  },
  {
    displayName: "Ryan Shaw",
    layer: "tesla_ownership",
    youtubeChannelId: "UCfv7-e6_6ZhvDL9-7Yw5OVA",
    youtubeHandle: "@ryanshawtech",
    rssUrl: null,
    focusDescription:
      "Over-the-air software updates, tips & tricks, hidden touchscreen features, battery optimization settings.",
    isActive: true,
  },
  {
    displayName: "Vegas Carmen",
    layer: "tesla_ownership",
    youtubeChannelId: "UCzy15HY8Z0DgeGRZIk7LzLQ",
    youtubeHandle: "@VegasCarmen",
    rssUrl: null,
    focusDescription:
      "Real-world ownership, cabin utility, road-tripping logic, rigorous product/accessory testing.",
    isActive: true,
  },
  {
    displayName: "Iowa Tesla Guy",
    layer: "tesla_ownership",
    youtubeChannelId: "UCFOMi555hn7mUDdQYBKQQXA",
    youtubeHandle: "@iowatesla",
    rssUrl: null,
    focusDescription:
      "FSD stress tests, seasonal battery/range performance, unedited autonomous driving reality checks.",
    isActive: true,
  },
  {
    displayName: "Gjeebs",
    layer: "tesla_ownership",
    youtubeChannelId: "UCC1Mi4fVXKETdFGDlW7rC3w",
    youtubeHandle: "@Gjeebs",
    rssUrl: null,
    focusDescription:
      "Mechanical audits, physical ride comfort/suspension tracking, model-vs-model deep dives.",
    isActive: true,
  },
];

export function resolveRssUrl(source: Pick<SeedSource, "youtubeChannelId" | "rssUrl">) {
  if (source.rssUrl) return source.rssUrl;
  if (source.youtubeChannelId) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${source.youtubeChannelId}`;
  }
  return null;
}
