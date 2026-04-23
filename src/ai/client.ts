import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type GenerateContentResult,
  type Part,
} from "@google/generative-ai";

const globalForGemini = globalThis as unknown as {
  genai: GoogleGenerativeAI | undefined;
};

export const genai =
  globalForGemini.genai ??
  new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

if (process.env.NODE_ENV !== "production") globalForGemini.genai = genai;

/** Primary model — newest + best structured-output support. */
export const MODEL = "gemini-2.5-flash";
/** Fallback used when the primary is overloaded (503). */
export const MODEL_FALLBACK = "gemini-2.5-flash-lite";

// ----------------------------------------------------------------------
// Resilient generateContent wrapper
//
// Gemini's free/shared tier returns 503 "model overloaded" a few times a day,
// and occasionally 429 on short bursts. We retry transient errors with
// exponential backoff, then fall back to a lighter sibling model if the
// primary is still unhappy. Non-transient errors (400, 401, invalid schema,
// etc.) are rethrown immediately so bugs surface fast.
// ----------------------------------------------------------------------

const TRANSIENT_STATUSES = [429, 500, 502, 503, 504];
// Kept modest so total wall time stays well under Vercel's function
// timeout (configured in vercel.json to 60s). 3 attempts × ~5s each
// call + 1.5s total backoff = ~17s budget.
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // Google SDK embeds the status code in the error message
  return TRANSIENT_STATUSES.some((s) => msg.includes(`[${s} `) || msg.includes(`${s} `));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type ContentInput = string | Array<string | Part>;

/**
 * Runs model.generateContent(content) with retry + model fallback.
 * `buildModel` is a factory so we can swap model names on the last attempt.
 */
export async function generateContentWithRetry(
  buildModel: (modelName: string) => GenerativeModel,
  content: ContentInput
): Promise<GenerateContentResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Use fallback model on the last attempt only
    const useFallback = attempt === MAX_ATTEMPTS;
    const model = buildModel(useFallback ? MODEL_FALLBACK : MODEL);

    try {
      return await model.generateContent(content);
    } catch (err) {
      lastError = err;
      if (!isTransientError(err)) throw err;

      // Exponential backoff: 500ms, 1s, 2s
      if (attempt < MAX_ATTEMPTS) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[ai] Gemini transient error on attempt ${attempt}, retrying in ${delay}ms…`,
          err instanceof Error ? err.message : err
        );
        await sleep(delay);
      }
    }
  }

  // Re-wrap so the caller sees a friendlier message
  throw new Error(
    "The AI model is temporarily unavailable. We retried a few times — please try again in a minute. " +
      (lastError instanceof Error ? `(${lastError.message})` : "")
  );
}
