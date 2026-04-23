import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { genai, generateContentWithRetry } from "../client";
import { MeetingSummarySchema, type MeetingSummary } from "../schemas/meetingSummary";

const SYSTEM_PROMPT = `You are CounselFlow, an AI assistant for independent college counselors.

Your task is to process raw meeting notes into a structured summary with actionable outputs. You turn messy notes into organized, professional documentation.

## Rules
- Extract only what's explicitly stated or clearly implied in the notes.
- Never invent information not present in the notes.
- Action items should be specific and assignable.
- The follow-up email should be professional, warm, and concise.
- If the notes are brief, produce a proportionally brief summary — don't pad.
- Assign priority to action items based on deadlines and urgency cues in the notes.`;

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING, description: "2-3 paragraph structured summary of the meeting" },
    keyDecisions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          decision: { type: SchemaType.STRING },
          context: { type: SchemaType.STRING },
        },
        required: ["decision", "context"],
      },
    },
    actionItems: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          owner: { type: SchemaType.STRING, format: "enum", enum: ["counselor", "student", "parent", "other"] },
          dueDate: { type: SchemaType.STRING, description: "ISO date string if mentioned" },
          priority: { type: SchemaType.STRING, format: "enum", enum: ["urgent", "high", "medium", "low"] },
          notes: { type: SchemaType.STRING },
        },
        required: ["title", "owner", "priority"],
      },
    },
    studentMoodAndEngagement: { type: SchemaType.STRING, description: "Brief note on student engagement if observable" },
    followUpDraft: {
      type: SchemaType.OBJECT,
      properties: {
        subject: { type: SchemaType.STRING },
        body: { type: SchemaType.STRING, description: "Draft follow-up email to student/family" },
      },
      required: ["subject", "body"],
    },
    caseFileUpdates: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          field: { type: SchemaType.STRING },
          suggestedValue: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING },
        },
        required: ["field", "suggestedValue", "reason"],
      },
    },
  },
  required: ["summary", "keyDecisions", "actionItems", "followUpDraft", "caseFileUpdates"],
};

interface SummaryContext {
  student: {
    firstName: string;
    lastName: string;
    gradeLevel: string;
    phase: string;
  };
  meetingType: string;
  rawNotes: string;
  previousMeetingSummary: string | null;
}

export async function generateMeetingSummary(
  context: SummaryContext
): Promise<{ summary: MeetingSummary; usage: { inputTokens: number; outputTokens: number } }> {
  const userMessage = `Process the following meeting notes into a structured summary.

## Student
- Name: ${context.student.firstName} ${context.student.lastName}
- Grade: ${context.student.gradeLevel}
- Phase: ${context.student.phase}

## Meeting Type
${context.meetingType}

${context.previousMeetingSummary ? `## Previous Meeting Summary\n${context.previousMeetingSummary}\n` : ""}

## Raw Meeting Notes
${context.rawNotes}

Process these notes into a structured summary with action items, decisions, a follow-up email draft, and any suggested case file updates.`;

  const result = await generateContentWithRetry(
    (modelName) =>
      genai.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    userMessage
  );
  const response = result.response;
  const text = response.text();
  const parsed = JSON.parse(text);
  const summary = MeetingSummarySchema.parse(parsed);

  const usage = response.usageMetadata;

  return {
    summary,
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    },
  };
}
