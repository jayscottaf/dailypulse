import { z } from "zod";

export const preferencesSchema = z.object({
  topics: z.array(z.enum(["deep_tech_ai", "tesla_ownership", "macro_financial"])).default(["deep_tech_ai", "tesla_ownership", "macro_financial"]),
  interests: z.string().max(500).default(""),
  layout: z.enum(["cards", "list"]).default("cards"),
  theme: z.enum(["dark", "light"]).default("dark"),
  briefLength: z.union([z.literal(3), z.literal(5)]).default(3),
  mutedSourceIds: z.array(z.string().uuid()).default([]),
});
export type ReaderPreferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences = preferencesSchema.parse({});
export type ReadingState = { saved: boolean; read: boolean; less: boolean };
export type ReaderContext = { preferences: ReaderPreferences; states: Record<string, ReadingState>; lessSourceIds: string[] };
export const emptyReadingState: ReadingState = { saved: false, read: false, less: false };
export const emptyReaderContext: ReaderContext = { preferences: defaultPreferences, states: {}, lessSourceIds: [] };
