import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { genai, generateContentWithRetry } from "../client";
import { MeetingPrepSchema, type MeetingPrep } from "../schemas/meetingPrep";

const SYSTEM_PROMPT = `You are CounselFlow, an AI assistant for independent college counselors.

Your task is to generate a pre-meeting preparation brief. You help the counselor walk into every meeting fully prepared — knowing exactly where the student stands, what's changed, what's urgent, and what to discuss.

## Rules
- Only state facts from the provided data. Never invent or assume information.
- If data is missing, say so explicitly.
- Be concise and actionable — this is a working document, not an essay.
- Prioritize items by urgency and importance.
- Flag risks clearly but don't be alarmist.`;

// Gemini JSON schema for structured output
const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    studentSnapshot: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING },
        grade: { type: SchemaType.STRING },
        phase: { type: SchemaType.STRING },
        gpa: { type: SchemaType.STRING },
        testScores: { type: SchemaType.STRING },
        schoolList: { type: SchemaType.STRING },
      },
      required: ["name", "grade", "phase"],
    },
    changesSinceLastMeeting: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          change: { type: SchemaType.STRING },
          significance: { type: SchemaType.STRING, format: "enum", enum: ["high", "medium", "low"] },
        },
        required: ["change", "significance"],
      },
    },
    unfinishedItems: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          item: { type: SchemaType.STRING },
          status: { type: SchemaType.STRING },
          urgency: { type: SchemaType.STRING, format: "enum", enum: ["high", "medium", "low"] },
        },
        required: ["item", "status", "urgency"],
      },
    },
    upcomingDeadlines: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          deadline: { type: SchemaType.STRING },
          date: { type: SchemaType.STRING },
          daysAway: { type: SchemaType.NUMBER },
        },
        required: ["deadline", "date", "daysAway"],
      },
    },
    suggestedAgenda: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          topic: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING },
          priority: { type: SchemaType.NUMBER },
        },
        required: ["topic", "reason", "priority"],
      },
    },
    risksToDiscuss: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          risk: { type: SchemaType.STRING },
          severity: { type: SchemaType.STRING, format: "enum", enum: ["critical", "warning", "info"] },
          recommendation: { type: SchemaType.STRING },
        },
        required: ["risk", "severity", "recommendation"],
      },
    },
    talkingPoints: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    "studentSnapshot",
    "changesSinceLastMeeting",
    "unfinishedItems",
    "upcomingDeadlines",
    "suggestedAgenda",
    "risksToDiscuss",
    "talkingPoints",
  ],
};

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
    : "No active risks."}`;

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
  let prep;
  try {
    const parsed = JSON.parse(text);
    prep = MeetingPrepSchema.parse(parsed);
  } catch (err) {
    console.error("[meetingPrep] AI response parsing failed:", err, "raw:", text.slice(0, 500));
    throw new Error("AI returned an invalid response. Please try again.");
  }

  const usage = response.usageMetadata;

  return {
    prep,
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    },
  };
}
