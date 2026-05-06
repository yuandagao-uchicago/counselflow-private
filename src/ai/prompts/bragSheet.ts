import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { genai, generateContentWithRetry } from "../client";
import {
  BragSheetSchema,
  RequestEmailDraftSchema,
  type BragSheet,
  type RequestEmailDraft,
} from "../schemas/bragSheet";

// ----- Brag Sheet Generation -----

const BRAG_SHEET_SYSTEM_PROMPT = `You are CounselFlow, an AI assistant for independent college counselors.

Your task is to generate a "brag sheet" — a document that helps a recommender write a strong, specific recommendation letter for a college applicant.

## Rules
- Use ONLY information provided in the student context. Never invent achievements, metrics, or anecdotes.
- Tailor the brag sheet to the recommender's type and relationship. A teacher should get academic-focused highlights; an employer should get work-related ones; a mentor should get personal growth examples.
- Suggest anecdotes the recommender might already know about based on their relationship — frame these as prompts, not assertions.
- Keep tone warm, professional, and helpful. This is a tool for the recommender, not a draft of the letter itself.
- Focus on qualities the recommender would have directly observed.
- If the student's profile is sparse, produce a proportionally brief brag sheet — don't pad with generic filler.`;

const bragSheetResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    studentOverview: {
      type: SchemaType.STRING,
      description: "2-3 sentence overview of the student",
    },
    academicHighlights: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          highlight: { type: SchemaType.STRING },
          context: { type: SchemaType.STRING },
        },
        required: ["highlight"],
      },
    },
    activitiesAndLeadership: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          activity: { type: SchemaType.STRING },
          role: { type: SchemaType.STRING },
          impact: { type: SchemaType.STRING },
        },
        required: ["activity", "impact"],
      },
    },
    personalQualities: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    specificAnecdotes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    collegeGoals: { type: SchemaType.STRING },
    suggestedThemes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    talkingPoints: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    "studentOverview",
    "academicHighlights",
    "activitiesAndLeadership",
    "personalQualities",
    "specificAnecdotes",
    "collegeGoals",
    "suggestedThemes",
    "talkingPoints",
  ],
};

export interface BragSheetContext {
  student: {
    firstName: string;
    lastName: string;
    gradeLevel: string;
    phase: string;
    gpaUnweighted: number | null;
    gpaWeighted: number | null;
    satScore: number | null;
    actScore: number | null;
    intendedMajors: string[];
    interests: string[];
    personalNotes: string | null;
  };
  activities: Array<{
    name: string;
    category: string;
    role: string | null;
    description: string | null;
    significance: string | null;
  }>;
  recommender: {
    name: string;
    type: string;
    relationship: string | null;
    organization: string | null;
  };
  applicationContext: string | null;
}

export async function generateBragSheet(context: BragSheetContext): Promise<{
  bragSheet: BragSheet;
  usage: { inputTokens: number; outputTokens: number };
}> {
  const userMessage = `Generate a brag sheet for this student's recommender.

## Student Profile
Name: ${context.student.firstName} ${context.student.lastName}
Grade: ${context.student.gradeLevel} | Phase: ${context.student.phase}
${context.student.gpaUnweighted ? `GPA (UW): ${context.student.gpaUnweighted}` : ""}
${context.student.gpaWeighted ? `GPA (W): ${context.student.gpaWeighted}` : ""}
${context.student.satScore ? `SAT: ${context.student.satScore}` : ""}
${context.student.actScore ? `ACT: ${context.student.actScore}` : ""}
Intended Majors: ${context.student.intendedMajors.length > 0 ? context.student.intendedMajors.join(", ") : "Undecided"}
Interests: ${context.student.interests.length > 0 ? context.student.interests.join(", ") : "Not specified"}
${context.student.personalNotes ? `Counselor Notes: ${context.student.personalNotes}` : ""}

## Activities (${context.activities.length})
${
  context.activities.length > 0
    ? context.activities
        .map(
          (a) =>
            `- ${a.name} (${a.category})${a.role ? ` — ${a.role}` : ""}${a.description ? `: ${a.description}` : ""}${a.significance ? ` [${a.significance}]` : ""}`
        )
        .join("\n")
    : "No activities on file yet."
}

## Recommender
Name: ${context.recommender.name}
Type: ${context.recommender.type}
${context.recommender.relationship ? `Relationship: ${context.recommender.relationship}` : ""}
${context.recommender.organization ? `Organization: ${context.recommender.organization}` : ""}

${context.applicationContext ? `## Application Context\n${context.applicationContext}` : ""}`;

  const result = await generateContentWithRetry(
    (modelName) =>
      genai.getGenerativeModel({
        model: modelName,
        systemInstruction: BRAG_SHEET_SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: bragSheetResponseSchema,
        },
      }),
    userMessage
  );
  const response = result.response;
  const text = response.text();
  let bragSheet: BragSheet;
  try {
    const parsed = JSON.parse(text);
    bragSheet = BragSheetSchema.parse(parsed);
  } catch (err) {
    console.error("[bragSheet] AI response parsing failed:", err, "raw:", text.slice(0, 500));
    throw new Error("AI returned an invalid response. Please try again.");
  }

  const usage = response.usageMetadata;
  return {
    bragSheet,
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    },
  };
}

// ----- Request Email Generation -----

const REQUEST_EMAIL_SYSTEM_PROMPT = `You are CounselFlow, an AI assistant for independent college counselors.

Your task is to draft a personalized email from a counselor to a recommender, requesting a recommendation letter for a student.

## Rules
- The email should be professional, warm, and concise (under 250 words).
- Include specific context about the student so the recommender knows what to highlight.
- Reference the recommender's relationship to the student.
- If a deadline is provided, mention it clearly but politely.
- Never fabricate details not in the provided context.
- The tone should reflect that the counselor is asking a professional favor.`;

const requestEmailResponseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    subject: { type: SchemaType.STRING, description: "Email subject line" },
    body: { type: SchemaType.STRING, description: "Email body text" },
  },
  required: ["subject", "body"],
};

export interface RequestEmailContext extends BragSheetContext {
  counselorName: string;
  deadline: string | null;
}

export async function generateRequestEmailDraft(
  context: RequestEmailContext
): Promise<{
  draft: RequestEmailDraft;
  usage: { inputTokens: number; outputTokens: number };
}> {
  const userMessage = `Draft a recommendation request email.

## From (Counselor)
${context.counselorName}

## To (Recommender)
${context.recommender.name} (${context.recommender.type})
${context.recommender.relationship ? `Relationship to student: ${context.recommender.relationship}` : ""}
${context.recommender.organization ? `At: ${context.recommender.organization}` : ""}

## About (Student)
${context.student.firstName} ${context.student.lastName} — ${context.student.gradeLevel}
${context.student.intendedMajors.length > 0 ? `Interested in: ${context.student.intendedMajors.join(", ")}` : ""}

## Key Highlights to Mention
${
  context.activities.length > 0
    ? context.activities
        .slice(0, 5)
        .map((a) => `- ${a.name}${a.role ? ` (${a.role})` : ""}`)
        .join("\n")
    : "No activities listed yet."
}

${context.applicationContext ? `## Application Context\n${context.applicationContext}` : ""}
${context.deadline ? `## Deadline\n${context.deadline}` : ""}`;

  const result = await generateContentWithRetry(
    (modelName) =>
      genai.getGenerativeModel({
        model: modelName,
        systemInstruction: REQUEST_EMAIL_SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: requestEmailResponseSchema,
        },
      }),
    userMessage
  );
  const response = result.response;
  const text = response.text();
  let draft: RequestEmailDraft;
  try {
    const parsed = JSON.parse(text);
    draft = RequestEmailDraftSchema.parse(parsed);
  } catch (err) {
    console.error("[requestEmail] AI response parsing failed:", err, "raw:", text.slice(0, 500));
    throw new Error("AI returned an invalid response. Please try again.");
  }

  const usage = response.usageMetadata;
  return {
    draft,
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    },
  };
}
