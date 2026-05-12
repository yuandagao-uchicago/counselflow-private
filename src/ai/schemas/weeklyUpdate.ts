import { z } from "zod";

/**
 * Weekly update email draft — what Gemini returns.
 * Plain {subject, body} so it slots into the same review-queue surface as
 * the recommender request and meeting follow-up drafts.
 */
export const WeeklyUpdateSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(20).max(5000),
});

export type WeeklyUpdate = z.infer<typeof WeeklyUpdateSchema>;
