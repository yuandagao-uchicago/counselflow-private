import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { genai, MODEL } from "../client";
import {
  ProfileExtractionSchema,
  type ProfileExtraction,
} from "../schemas/profileExtraction";

const SYSTEM_PROMPT = `You are CounselFlow, an AI assistant for independent college counselors.

Your task: read a document a counselor uploaded for a student and extract
structured profile fields. The document might be a transcript, résumé, test
score report, intake questionnaire, or something else.

## Rules
- Auto-detect the document type from its content.
- Extract ONLY fields that are explicitly present. Never guess, infer, or fabricate values.
- If a field isn't in the document, OMIT it — don't return null or empty strings.
- GPAs: return as numbers (e.g. 3.85). If the scale is odd, prefer the most
  prominent GPA stated; otherwise skip.
- SAT: return 400–1600 composite only. ACT: 1–36 composite only. Skip subject/section scores.
- Majors: return a clean array of distinct majors or fields of study.
- Interests: return a clean array of activities, hobbies, extracurriculars.
- personalNotes: capture any free-form counselor-relevant context (family
  situation, learning differences, standout narrative) — only if actually present in the doc.
- In \`extractionNotes\`, write 1–3 short sentences summarizing what you found
  and what was ambiguous or missing. Be candid about low-confidence extractions.`;

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    detectedDocType: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["TRANSCRIPT", "TEST_SCORE", "RESUME", "QUESTIONNAIRE", "OTHER"],
    },
    firstName: { type: SchemaType.STRING },
    lastName: { type: SchemaType.STRING },
    preferredName: { type: SchemaType.STRING },
    email: { type: SchemaType.STRING },
    phone: { type: SchemaType.STRING },
    highSchool: { type: SchemaType.STRING },
    graduationYear: { type: SchemaType.NUMBER },
    gpaUnweighted: { type: SchemaType.NUMBER },
    gpaWeighted: { type: SchemaType.NUMBER },
    satScore: { type: SchemaType.NUMBER },
    actScore: { type: SchemaType.NUMBER },
    classRank: { type: SchemaType.STRING },
    courseRigor: { type: SchemaType.STRING },
    intendedMajors: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    interests: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    personalNotes: { type: SchemaType.STRING },
    extractionNotes: { type: SchemaType.STRING },
  },
  required: ["detectedDocType", "extractionNotes"],
};

export interface ExtractProfileInput {
  /** Fetchable URL to the uploaded file (Vercel Blob URL). */
  fileUrl: string;
  /** MIME type as reported at upload time (pdf / image / plain). */
  mimeType: string;
  /** Existing student context so Gemini can skip fields already populated. */
  currentStudent: {
    firstName: string;
    lastName: string;
    hasGPA: boolean;
    hasSAT: boolean;
    hasACT: boolean;
  };
}

export interface ExtractProfileResult {
  extraction: ProfileExtraction;
  usage: { inputTokens: number; outputTokens: number };
}

export async function extractProfileFromDocument(
  input: ExtractProfileInput
): Promise<ExtractProfileResult> {
  // Fetch the file into memory as base64 — Gemini's inline_data parts take
  // up to ~20 MB. We cap uploads at 10 MB so this is safe.
  const res = await fetch(input.fileUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch uploaded file: ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const base64 = buffer.toString("base64");

  const model = genai.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const studentContext = `## Student context (for disambiguation)
- Known name: ${input.currentStudent.firstName} ${input.currentStudent.lastName}
- GPA recorded already: ${input.currentStudent.hasGPA ? "yes" : "no"}
- SAT recorded already: ${input.currentStudent.hasSAT ? "yes" : "no"}
- ACT recorded already: ${input.currentStudent.hasACT ? "yes" : "no"}

If the document is clearly about a different person, set extractionNotes
to flag it and omit the fields.`;

  const result = await model.generateContent([
    { text: studentContext },
    {
      inlineData: {
        mimeType: input.mimeType,
        data: base64,
      },
    },
  ]);

  const response = result.response;
  const text = response.text();
  const parsed = JSON.parse(text);
  const extraction = ProfileExtractionSchema.parse(parsed);

  const usage = response.usageMetadata;
  return {
    extraction,
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
    },
  };
}
