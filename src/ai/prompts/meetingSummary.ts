import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, MODELS } from "../client";
import { MeetingSummarySchema, type MeetingSummary } from "../schemas/meetingSummary";

const SYSTEM_PROMPT = `You are CounselFlow, an AI assistant for independent college counselors.

Your task is to process raw meeting notes into a structured summary with actionable outputs. You turn messy notes into organized, professional documentation.

## Rules
- Extract only what's explicitly stated or clearly implied in the notes.
- Never invent information not present in the notes.
- Action items should be specific and assignable.
- The follow-up email should be professional, warm, and concise.
- If the notes are brief, produce a proportionally brief summary — don't pad.
- Assign priority to action items based on deadlines and urgency cues in the notes.

## Output
Return a structured JSON object with the meeting summary.`;

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

Process these notes into a structured summary with action items, decisions, a follow-up email draft, and any suggested case file updates. Return as a JSON object matching the required schema.`;

  const response = await anthropic.messages.create({
    model: MODELS.smart,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
    tools: [
      {
        name: "meeting_summary",
        description: "Output the structured meeting summary",
        input_schema: z.toJSONSchema(MeetingSummarySchema) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "meeting_summary" },
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("AI did not return a structured summary");
  }

  const summary = MeetingSummarySchema.parse(toolUse.input);

  return {
    summary,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
