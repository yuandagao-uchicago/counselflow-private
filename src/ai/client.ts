import { GoogleGenerativeAI } from "@google/generative-ai";

const globalForGemini = globalThis as unknown as {
  genai: GoogleGenerativeAI | undefined;
};

export const genai =
  globalForGemini.genai ??
  new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

if (process.env.NODE_ENV !== "production") globalForGemini.genai = genai;

export const MODEL = "gemini-2.5-flash";
