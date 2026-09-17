export const TOPICS = {
  deep_tech_ai: "AI & tools", technology: "Tech", tesla_ownership: "Tesla",
  aviation: "Aviation", travel_points: "Travel & points", local_business: "Local business & property",
  macro_financial: "Money & taxes", home_design: "Home & design",
} as const;
export const topicKeys = ["deep_tech_ai", "technology", "tesla_ownership", "aviation", "travel_points", "local_business", "macro_financial", "home_design"] as const;
export type Topic = keyof typeof TOPICS;
export const coreTopics: Topic[] = ["deep_tech_ai", "technology", "tesla_ownership"];
export const defaultTopics: Topic[] = [...coreTopics, "aviation", "travel_points", "local_business", "macro_financial"];
