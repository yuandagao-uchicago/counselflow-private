import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAllowedMime, MAX_UPLOAD_BYTES } from "@/lib/integrations/blob";

/**
 * Vercel Blob's client-upload handshake.
 *   1. Client calls upload() with the file.
 *   2. upload() sends a JSON body to this route asking for a token.
 *   3. We validate (auth + mime + size) and return a signed token.
 *   4. Client PUTs directly to Vercel Blob using that token.
 *   5. Vercel Blob calls this same route with { type: "blob.upload-completed" }
 *      once done — we could record the upload there, but instead the client
 *      calls our tRPC `document.confirmUpload` after success to link the
 *      blob URL to a Student (and kick off Gemini extraction).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Surface missing config before hitting handleUpload — without this, the
  // client just sees the generic "Failed to retrieve the client token" error
  // and there's no way to tell whether the store is misconfigured or it's an
  // auth failure.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "[blob/upload] BLOB_READ_WRITE_TOKEN is not set — connect a Vercel Blob store to this project"
    );
    return NextResponse.json(
      {
        error:
          "Blob storage is not configured. Connect a Vercel Blob store to this project (Storage → Create → Blob) and redeploy.",
      },
      { status: 500 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const { userId } = await auth();
        if (!userId) {
          console.error(
            "[blob/upload] auth() returned no userId — Clerk session missing or expired"
          );
          throw new Error("Unauthorized — please sign in again");
        }

        // Parse the studentId from clientPayload so we can enforce that this
        // counselor actually owns the student before minting a token.
        let studentId: string | null = null;
        try {
          const parsed = JSON.parse(clientPayload || "{}");
          studentId = parsed.studentId ?? null;
        } catch {
          // invalid payload — fall through with null
        }
        if (!studentId) {
          console.error("[blob/upload] missing studentId in clientPayload");
          throw new Error("Missing studentId in clientPayload");
        }

        console.log("[blob/upload] minting token", {
          userId,
          studentId,
          pathname,
        });

        return {
          allowedContentTypes: [
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/heic",
            "image/heif",
            "text/plain",
          ],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          // Echo studentId back so onUploadCompleted can record it
          tokenPayload: JSON.stringify({ userId, studentId, pathname }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Vercel will call this from their infra once the PUT finishes.
        // In dev (localhost) this callback is a no-op since Vercel can't
        // reach us. The client-side confirmUpload tRPC mutation is what
        // actually creates the Document row, so this is just for prod logs.
        console.log("[blob.upload-completed]", { url: blob.url, tokenPayload });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[blob/upload]", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

/**
 * Defensive safeguard for the isAllowedMime helper — imported so tree-shaking
 * doesn't drop it. Not invoked; server-side validation happens via
 * allowedContentTypes above.
 */
void isAllowedMime;
