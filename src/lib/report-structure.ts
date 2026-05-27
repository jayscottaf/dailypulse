import { z } from "zod";

export const reportItemSchema = z.object({
  text: z.string(),
  sourceVideoIds: z.array(z.string()).default([]),
});

export const reportSubsectionSchema = z.object({
  title: z.string(),
  items: z.array(reportItemSchema).default([]),
});

export const reportSectionSchema = z.object({
  title: z.string(),
  subsections: z.array(reportSubsectionSchema).default([]),
});

export const reportStructureSchema = z.object({
  version: z.literal(1).default(1),
  sections: z.array(reportSectionSchema).default([]),
});

export type ReportStructure = z.infer<typeof reportStructureSchema>;

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function normalizeItem(value: unknown) {
  if (typeof value === "string") {
    return { text: value, sourceVideoIds: [] };
  }
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    text: String(record.text ?? record.content ?? record.body ?? ""),
    sourceVideoIds: stringArray(record.sourceVideoIds ?? record.source_video_ids ?? record.sources),
  };
}

function normalizeSubsection(value: unknown) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const items = Array.isArray(record.items) ? record.items : Array.isArray(record.bullets) ? record.bullets : [];
  return {
    title: String(record.title ?? record.heading ?? ""),
    items: items.map(normalizeItem).filter((item) => item.text),
  };
}

function normalizeSection(value: unknown) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const subsections = Array.isArray(record.subsections)
    ? record.subsections
    : Array.isArray(record.sections)
      ? record.sections
      : [];
  return {
    title: String(record.title ?? record.heading ?? ""),
    subsections: subsections.map(normalizeSubsection).filter((subsection) => subsection.title || subsection.items.length),
  };
}

export function parseReportStructure(value: unknown) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sections = Array.isArray(record.sections) ? record.sections : [];
  const normalized = {
    version: 1,
    sections: sections.map(normalizeSection).filter((section) => section.title || section.subsections.length),
  };
  const parsed = reportStructureSchema.safeParse(normalized);
  return parsed.success && parsed.data.sections.length > 0 ? parsed.data : null;
}
