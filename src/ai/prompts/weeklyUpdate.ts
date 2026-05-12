import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { genai, generateContentWithRetry } from "../client";
import { WeeklyUpdateSchema, type WeeklyUpdate } from "../schemas/weeklyUpdate";

const SYSTEM_PROMPT = `You are CounselFlow, an AI assistant for independent college counselors.

Your task is to draft a weekly update email from the counselor to one specific audience (a parent or the student). The draft will be reviewed and edited by the counselor before sending — your job is to make the review fast, not to ship final copy.

## Rules
- Use ONLY information provided in the context. Never invent meetings, completed tasks, deadlines, or accomplishments.
- The audience determines tone:
  - PARENT audience: warm but professional. Third-person about the student ("Maya"). Surface what's been done, what's coming up, and any moments where parent involvement would help. Avoid college-counseling jargon.
  - STUDENT audience: direct and supportive. Second-person ("you"). Plain language, specific next actions, no over-explaining.
- Structure (loose, not rigid):
  1. A short opener acknowledging the week.
  2. "What we got done" — 2–5 bullets pulled from completed items.
  3. "What's coming up" — the next concrete deadlines and tasks.
  4. Optional: ask or callout (only if the counselor's note or the data warrants it).
  5. Sign-off in the counselor's name.
- Keep the body under ~250 words. If there's truly nothing meaningful to report, say so briefly rather than padding.
- If the counselor included a "personal note", weave it naturally into the relevant section — don't quote it verbatim or tack it on at the bottom.
- Never invent specific dates or numbers that aren't in the data.
- Don't make promises on the counselor's behalf (e.g. "I will email by Friday") unless the counselor's note says it.`;

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    subject: {
      type: SchemaType.STRING,
      description:
        "Short, specific subject line. Examples: 'Weekly update — applications progress', 'Quick update on Maya this week'.",
    },
    body: {
      type: SchemaType.STRING,
      description:
        "Plain-text email body (newline-separated, no HTML). 100–250 words.",
    },
  },
  required: ["subject", "body"],
};

export type WeeklyUpdateAudience = "PARENT" | "STUDENT";

export interface WeeklyUpdateContext {
  audience: WeeklyUpdateAudience;
  counselorName: string;
  recipientFirstName: string | null; // parent first name, or student first name
  student: {
    firstName: string;
    lastName: string;
    preferredName: string | null;
    gradeLevel: string;
    phase: string;
  };
  /** Items completed in the last 7 days. */
  completed: {
    tasks: Array<{ title: string; completedAt: Date }>;
    milestones: Array<{ title: string; completedAt: Date }>;
    meetings: Array<{ scheduledAt: Date; type: string; summary: string | null }>;
  };
  /** Items active or due in the next ~14 days. */
  upcoming: {
    tasks: Array<{ title: string; dueDate: Date | null; priority: string }>;
    deadlines: Array<{ school: string; type: string; date: Date }>;
    meetings: Array<{ scheduledAt: Date; type: string }>;
    milestones: Array<{ title: string; targetDate: Date | null }>;
  };
  /** Free-form note from the counselor to weave in. */
  personalNote: string | null;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function generateWeeklyUpdate(
  context: WeeklyUpdateContext,
): Promise<{
  draft: WeeklyUpdate;
  usage: { inputTokens: number; outputTokens: number };
}> {
  const displayName =
    context.student.preferredName ?? context.student.firstName;

  const userMessage = `Draft a weekly update email.

## Audience
${context.audience}${context.recipientFirstName ? ` (${context.recipientFirstName})` : ""}

## From
${context.counselorName}

## About
${displayName} ${context.student.lastName} — ${context.student.gradeLevel}, currently in the ${context.student.phase} phase.

## Completed this week
Tasks (${context.completed.tasks.length}):
${
  context.completed.tasks.length > 0
    ? context.completed.tasks
        .map((t) => `- ${t.title} (${fmtDate(t.completedAt)})`)
        .join("\n")
    : "(none)"
}

Milestones (${context.completed.milestones.length}):
${
  context.completed.milestones.length > 0
    ? context.completed.milestones
        .map((m) => `- ${m.title} (${fmtDate(m.completedAt)})`)
        .join("\n")
    : "(none)"
}

Meetings (${context.completed.meetings.length}):
${
  context.completed.meetings.length > 0
    ? context.completed.meetings
        .map(
          (m) =>
            `- ${m.type} on ${fmtDate(m.scheduledAt)}${m.summary ? ` — ${m.summary.slice(0, 240)}` : ""}`,
        )
        .join("\n")
    : "(none)"
}

## Coming up
Tasks (${context.upcoming.tasks.length}):
${
  context.upcoming.tasks.length > 0
    ? context.upcoming.tasks
        .map(
          (t) =>
            `- [${t.priority}] ${t.title}${t.dueDate ? ` — due ${fmtDate(t.dueDate)}` : ""}`,
        )
        .join("\n")
    : "(none)"
}

Application deadlines (${context.upcoming.deadlines.length}):
${
  context.upcoming.deadlines.length > 0
    ? context.upcoming.deadlines
        .map((d) => `- ${d.school} (${d.type}) — ${fmtDate(d.date)}`)
        .join("\n")
    : "(none)"
}

Meetings (${context.upcoming.meetings.length}):
${
  context.upcoming.meetings.length > 0
    ? context.upcoming.meetings
        .map((m) => `- ${m.type} on ${fmtDate(m.scheduledAt)}`)
        .join("\n")
    : "(none)"
}

Active milestones (${context.upcoming.milestones.length}):
${
  context.upcoming.milestones.length > 0
    ? context.upcoming.milestones
        .map(
          (m) =>
            `- ${m.title}${m.targetDate ? ` — target ${fmtDate(m.targetDate)}` : ""}`,
        )
        .join("\n")
    : "(none)"
}

${context.personalNote ? `## Counselor's note to weave in\n${context.personalNote}` : ""}`;

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
    userMessage,
  );

  const response = result.response;
  const text = response.text();
  let draft: WeeklyUpdate;
  try {
    const parsed = JSON.parse(text);
    draft = WeeklyUpdateSchema.parse(parsed);
  } catch (err) {
    console.error("[weeklyUpdate] AI response parsing failed:", err, "raw:", text.slice(0, 500));
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
