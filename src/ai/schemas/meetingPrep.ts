import { z } from "zod";

export const MeetingPrepSchema = z.object({
  studentSnapshot: z.object({
    name: z.string(),
    grade: z.string(),
    phase: z.string(),
    gpa: z.string().optional(),
    testScores: z.string().optional(),
    schoolList: z.string().optional(),
  }),
  changesSinceLastMeeting: z.array(
    z.object({
      change: z.string(),
      significance: z.enum(["high", "medium", "low"]),
    })
  ),
  unfinishedItems: z.array(
    z.object({
      item: z.string(),
      status: z.string(),
      urgency: z.enum(["high", "medium", "low"]),
    })
  ),
  upcomingDeadlines: z.array(
    z.object({
      deadline: z.string(),
      date: z.string(),
      daysAway: z.number(),
    })
  ),
  suggestedAgenda: z.array(
    z.object({
      topic: z.string(),
      reason: z.string(),
      priority: z.number(),
    })
  ),
  risksToDiscuss: z.array(
    z.object({
      risk: z.string(),
      severity: z.enum(["critical", "warning", "info"]),
      recommendation: z.string(),
    })
  ),
  talkingPoints: z.array(z.string()),
});

export type MeetingPrep = z.infer<typeof MeetingPrepSchema>;
