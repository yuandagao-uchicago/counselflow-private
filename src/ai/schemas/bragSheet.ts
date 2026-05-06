import { z } from "zod";

export const BragSheetSchema = z.object({
  studentOverview: z
    .string()
    .describe("2-3 sentence overview of the student tailored to what this recommender would know"),
  academicHighlights: z.array(
    z.object({
      highlight: z.string(),
      context: z.string().optional().describe("Why this matters for the recommendation"),
    })
  ),
  activitiesAndLeadership: z.array(
    z.object({
      activity: z.string(),
      role: z.string().optional(),
      impact: z.string().describe("What the student accomplished or demonstrated"),
    })
  ),
  personalQualities: z
    .array(z.string())
    .describe("Character traits the recommender could speak to based on their relationship"),
  specificAnecdotes: z
    .array(z.string())
    .describe("Suggested moments or examples the recommender might reference"),
  collegeGoals: z
    .string()
    .describe("What the student is looking for in college, relevant to this recommender's perspective"),
  suggestedThemes: z
    .array(z.string())
    .describe("2-3 themes the recommendation letter could focus on"),
  talkingPoints: z
    .array(z.string())
    .describe("Bullet points the student can discuss with the recommender in person"),
});

export type BragSheet = z.infer<typeof BragSheetSchema>;

export const RequestEmailDraftSchema = z.object({
  subject: z.string().describe("Email subject line"),
  body: z.string().describe("Professional email body requesting a recommendation letter"),
});

export type RequestEmailDraft = z.infer<typeof RequestEmailDraftSchema>;
