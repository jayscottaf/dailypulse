import type { Source } from "@/db/schema";

type CatalogSource = {
  key: string;
  displayName: string;
  layer: Source["layer"];
  rssUrl: string;
  focusDescription: string;
  pack: "core" | "personal" | "optional";
};

// Public feeds checked with the same parser and network policy as ingestion.
export const sourceCatalog: CatalogSource[] = [
  { key: "openai", displayName: "OpenAI News", layer: "deep_tech_ai", rssUrl: "https://openai.com/news/rss.xml", focusDescription: "Official model, product and developer announcements.", pack: "core" },
  { key: "huggingface", displayName: "Hugging Face Blog", layer: "deep_tech_ai", rssUrl: "https://huggingface.co/blog/feed.xml", focusDescription: "Open models, practical AI tools and implementation guides.", pack: "core" },
  { key: "verge-ai", displayName: "The Verge — AI", layer: "deep_tech_ai", rssUrl: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", focusDescription: "Independent reporting on AI products and their impact.", pack: "core" },
  { key: "ars", displayName: "Ars Technica", layer: "technology", rssUrl: "https://feeds.arstechnica.com/arstechnica/index", focusDescription: "Technology, software, security and science reporting.", pack: "core" },
  { key: "hacker-news", displayName: "Hacker News", layer: "technology", rssUrl: "https://news.ycombinator.com/rss", focusDescription: "Community discovery links. Titles only when discussion text is unavailable.", pack: "core" },
  { key: "not-a-tesla-app", displayName: "Not a Tesla App", layer: "tesla_ownership", rssUrl: "https://www.notateslaapp.com/rss", focusDescription: "Tesla software releases, ownership features and product news.", pack: "core" },
  { key: "tesla-model-y", displayName: "Tesla Motors Club — Model Y", layer: "tesla_ownership", rssUrl: "https://teslamotorsclub.com/tmc/forums/model-y.304/index.rss", focusDescription: "Individual owner discussions and experiences, labeled as forum posts.", pack: "core" },
  { key: "delta", displayName: "Delta News Hub", layer: "aviation", rssUrl: "https://news.delta.com/rss.xml", focusDescription: "Official Delta routes, fleet, business and operations news.", pack: "personal" },
  { key: "faa", displayName: "FAA Newsroom", layer: "aviation", rssUrl: "https://www.faa.gov/newsroom/press_releases/rss", focusDescription: "Official aviation and airport developments.", pack: "personal" },
  { key: "frequent-miler", displayName: "Frequent Miler", layer: "travel_points", rssUrl: "https://frequentmiler.com/feed/", focusDescription: "Travel rewards, loyalty programs and points news. Offers require checking the original terms.", pack: "personal" },
  { key: "saratoga-business", displayName: "Saratoga Today — Business", layer: "local_business", rssUrl: "https://saratogatodaynewspaper.com/category/business/feed/", focusDescription: "Saratoga area business openings, development and local commerce.", pack: "personal" },
  { key: "blender", displayName: "Blender News", layer: "home_design", rssUrl: "https://www.blender.org/feed/", focusDescription: "Official Blender releases and tools for 3D and property visualization.", pack: "optional" },
];

export function catalogSelection(keys: string[]) {
  if (!keys.length || keys.some(key => !sourceCatalog.some(source => source.key === key))) throw new Error("Choose sources from the library.");
  return sourceCatalog.filter(source => keys.includes(source.key));
}
