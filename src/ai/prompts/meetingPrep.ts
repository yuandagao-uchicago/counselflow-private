import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, MODELS } from "../client";
import { MeetingPrepSchema, type MeetingPrep } from "../schemas/meetingPrep";

const SYSTEM_PROMPT = `You are CounselFlow, an AI assistant for independent college counselors.

Your task is to generate a pre-meeting preparation brief. You help the counselor walk into every meeting fully prepared — knowing exactly where the student stands, what's changed, what's urgent, and what to discuss.

## Rules
- Only state facts from the provided data. Never invent or assume information.
- If data is missing, say so explicitly.
- Be concise and actionable — this is a working document, not an essay.
- Prioritize items by urgency and importance.
- Flag risks clearly but don't be alarmist.

## Output
Return a structured JSON object with the meeting prep brief.`;

interface PrepContext {
  student: {
    firstName: string;
    lastName: string;
    gradeLevel: string;
    phase: string;
    graduationYear: number;
    highSchool: string | null;
    gpaUnweighted: number | null;
    gpaWeighted: number | null;
    satScore: number | null;
    actScore: number | null;
    intendedMajors: string[];
    interests: string[];
    personalNotes: string | null;
  };
  recentMeetings: {
    scheduledAt: Date;
    type: string;
    summary: string | null;
  }[];
  openTasks: {
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
  }[];
  activeMilestones: {
    title: string;
    status: string;
    category: string;
    targetDate: Date | null;
  }[];
  riskFlags: {
    title: string;
    severity: string;
    description: string;
  }[];
  meetingType: string;
}

export async function generateMeetingPrep(
  context: PrepContext
): Promise<{ prep: MeetingPrep; usage: { inputTokens: number; outputTokens: number } }> {
  const userMessage = `Generate a meeting prep brief for the following student meeting.

## Student Profile
- Name: ${context.student.firstName} ${context.student.lastName}
- Grade: ${context.student.gradeLevel}
- Phase: ${context.student.phase}
- Graduation Year: ${context.student.graduationYear}
- High School: ${context.student.highSchool || "Not specified"}
- GPA (UW): ${context.student.gpaUnweighted ?? "Not recorded"}
- GPA (W): ${context.student.gpaWeighted ?? "Not recorded"}
- SAT: ${context.student.satScore ?? "Not recorded"}
- ACT: ${context.student.actScore ?? "Not recorded"}
- Intended Majors: ${context.student.intendedMajors.length > 0 ? context.student.intendedMajors.join(", ") : "Undecided"}
- Interests: ${context.student.interests.length > 0 ? context.student.interests.join(", ") : "Not specified"}
${context.student.personalNotes ? `- Counselor Notes: ${context.student.personalNotes}` : ""}

## Meeting Type
${context.meetingType}

## Recent Meetings
${context.recentMeetings.length > 0
    ? context.recentMeetings
        .map(
          (m) =>
            `- ${m.scheduledAt.toLocaleDateString()} (${m.type}): ${m.summary || "No summary recorded"}`
        )
        .join("\n")
    : "No previous meetings recorded."}

## Open Tasks (${context.openTasks.length})
${context.openTasks.length > 0
    ? context.openTasks
        .map(
          (t) =>
            `- [${t.priority}] ${t.title} (${t.status})${t.dueDate ? ` — due ${t.dueDate.toLocaleDateString()}` : ""}`
        )
        .join("\n")
    : "No open tasks."}

## Active Milestones (${context.activeMilestones.length})
${context.activeMilestones.length > 0
    ? context.activeMilestones
        .map(
          (m) =>
            `- ${m.title} [${m.status}] (${m.category})${m.targetDate ? ` — target ${m.targetDate.toLocaleDateString()}` : ""}`
        )
        .join("\n")
    : "No active milestones."}

## Active Risk Flags (${context.riskFlags.length})
${context.riskFlags.length > 0
    ? context.riskFlags
        .map((r) => `- [${r.severity}] ${r.title}: ${r.description}`)
        .join("\n")
    : "No active risks."}

Return the prep brief as a JSON object matching the required schema.`;

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
        name: "meeting_prep_brief",
        description: "Output the structured meeting prep brief",
        input_schema: z.toJSONSchema(MeetingPrepSchema) as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "meeting_prep_brief" },
  });

  // Extract the tool use result
  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("AI did not return a structured prep brief");
  }

  const prep = MeetingPrepSchema.parse(toolUse.input);

  return {
    prep,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
