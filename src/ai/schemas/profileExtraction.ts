import { z } from "zod";

/**
 * The shape Gemini returns after reading a student-profile-adjacent
 * document (transcript, résumé, test score, intake questionnaire, etc.).
 * Every field is optional — a transcript rarely has phone numbers, a
 * résumé rarely has GPA. We show suggestions only where Gemini actually
 * found data.
 */
export const ProfileExtractionSchema = z.object({
  detectedDocType: z.enum([
    "TRANSCRIPT",
    "TEST_SCORE",
    "RESUME",
    "QUESTIONNAIRE",
    "OTHER",
  ]),
  // Identity
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  preferredName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  // School
  highSchool: z.string().optional(),
  graduationYear: z.number().optional(),
  // Academics
  gpaUnweighted: z.number().optional(),
  gpaWeighted: z.number().optional(),
  satScore: z.number().optional(),
  actScore: z.number().optional(),
  classRank: z.string().optional(),
  courseRigor: z.string().optional(),
  // Direction
  intendedMajors: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  personalNotes: z.string().optional(),
  // Freeform explanation of what was found vs not — helps the counselor trust or reject
  extractionNotes: z.string(),
});

export type ProfileExtraction = z.infer<typeof ProfileExtractionSchema>;
