import { z } from "zod";

export const MeetingSummarySchema = z.object({
  summary: z.string().describe("2-3 paragraph structured summary of the meeting"),
  keyDecisions: z.array(
    z.object({
      decision: z.string(),
      context: z.string(),
    })
  ),
  actionItems: z.array(
    z.object({
      title: z.string(),
      owner: z.enum(["counselor", "student", "parent", "other"]),
      dueDate: z.string().optional().describe("ISO date string if mentioned"),
      priority: z.enum(["urgent", "high", "medium", "low"]),
      notes: z.string().optional(),
    })
  ),
  studentMoodAndEngagement: z.string().optional().describe("Brief note on student's engagement level if observable from notes"),
  followUpDraft: z.object({
    subject: z.string(),
    body: z.string().describe("Draft follow-up email to student/family summarizing the meeting"),
  }),
  caseFileUpdates: z.array(
    z.object({
      field: z.string(),
      suggestedValue: z.string(),
      reason: z.string(),
    })
  ).describe("Suggested updates to the student's profile based on meeting discussion"),
});

export type MeetingSummary = z.infer<typeof MeetingSummarySchema>;
