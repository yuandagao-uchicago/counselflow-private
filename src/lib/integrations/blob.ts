/**
 * Vercel Blob integration.
 *
 * Client-side uploads go through `@vercel/blob/client`'s `upload()` helper.
 * That helper calls our API route `/api/blob/upload` to mint a signed token
 * (so our BLOB_READ_WRITE_TOKEN never leaves the server), then PUTs the file
 * directly from the browser to Vercel Blob. No server bandwidth bottleneck.
 *
 * Our upload route is at: src/app/api/blob/upload/route.ts
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB — transcripts and résumés are small

export const ALLOWED_UPLOAD_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "text/plain",
] as const;

export function isAllowedMime(mime: string): boolean {
  return (ALLOWED_UPLOAD_MIMES as readonly string[]).includes(mime);
}

/** Derive a stable storage key for a student's document. */
export function blobKeyFor(studentId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `students/${studentId}/${Date.now()}_${safe}`;
}
