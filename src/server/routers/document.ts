import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { del as deleteBlob } from "@vercel/blob";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { verifyStudentOwnership } from "../lib/tenant";
import { extractProfileFromDocument } from "@/ai/prompts/profileExtraction";
import { createAIOutput } from "@/ai/provenance";
import { MODEL } from "@/ai/client";
import type { DocumentType } from "@prisma/client";

/**
 * Reject storage URLs that aren't Vercel Blob — otherwise the server would
 * fetch arbitrary attacker-supplied URLs (cloud metadata, internal services)
 * and feed the bytes to Gemini, surfacing the response back to the user.
 */
function assertVercelBlobUrl(rawUrl: string) {
  let host: string;
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:") {
      throw new Error("non-https");
    }
    host = u.hostname.toLowerCase();
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid storage URL" });
  }
  // Vercel Blob public URLs: <hash>.public.blob.vercel-storage.com
  if (!host.endsWith(".public.blob.vercel-storage.com")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Storage URL must be a Vercel Blob URL",
    });
  }
}

/**
 * Map Gemini's detectedDocType (string) to our Prisma enum.
 */
function mapDocType(detected: string): DocumentType {
  switch (detected) {
    case "TRANSCRIPT":
      return "TRANSCRIPT";
    case "TEST_SCORE":
      return "TEST_SCORE";
    case "RESUME":
      return "RESUME";
    case "QUESTIONNAIRE":
      return "QUESTIONNAIRE";
    default:
      return "OTHER";
  }
}

export const documentRouter = router({
  list: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);
      return prisma.document.findMany({
        where: { studentId: input.studentId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          documentType: true,
          storageUrl: true,
          extractionStatus: true,
          extractionError: true,
          processedAt: true,
          createdAt: true,
        },
      });
    }),

  /**
   * Called by the client after a successful blob upload. Creates the
   * Document row, kicks off Gemini extraction inline, and creates a
   * ReviewQueueItem for counselor approval.
   *
   * Runs synchronously because transcripts are small (<10MB) and Gemini
   * 2.5 Flash responds in a few seconds — fine for a mutation.
   */
  confirmUpload: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        fileName: z.string(),
        fileType: z.string(), // MIME
        fileSize: z.number(),
        storageUrl: z.string().url(),
        storageKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertVercelBlobUrl(input.storageUrl);
      const student = await verifyStudentOwnership(ctx.counselorId, input.studentId);

      // Dedup: reject if a document with this storageKey already exists
      const existing = await prisma.document.findFirst({
        where: { storageKey: input.storageKey, studentId: input.studentId },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This document has already been uploaded",
        });
      }

      // 1. Create Document row with status PROCESSING
      const doc = await prisma.document.create({
        data: {
          studentId: input.studentId,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          documentType: "OTHER",
          storageUrl: input.storageUrl,
          storageKey: input.storageKey,
          extractionStatus: "PROCESSING",
        },
      });

      // 2. Run Gemini extraction
      try {
        const { extraction, usage } = await extractProfileFromDocument({
          fileUrl: input.storageUrl,
          mimeType: input.fileType,
          currentStudent: {
            firstName: student.firstName,
            lastName: student.lastName,
            hasGPA: student.gpaUnweighted != null || student.gpaWeighted != null,
            hasSAT: student.satScore != null,
            hasACT: student.actScore != null,
          },
        });

        // 3. Save AI provenance
        const aiOutput = await createAIOutput({
          counselorId: ctx.counselorId,
          studentId: input.studentId,
          feature: "profile_extraction",
          sourceBasis: [
            {
              type: "document",
              id: doc.id,
              label: `${extraction.detectedDocType} · ${input.fileName}`,
            },
            {
              type: "profile",
              id: input.studentId,
              label: `${student.firstName} ${student.lastName}`,
            },
          ],
          confidence: "MEDIUM",
          output: extraction,
          modelId: MODEL,
          tokenUsage: usage,
        });

        // 4. Update Document with extracted data + detected type
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            documentType: mapDocType(extraction.detectedDocType),
            structuredData: JSON.parse(JSON.stringify(extraction)),
            processedAt: new Date(),
            aiOutputId: aiOutput.id,
            extractionStatus: "READY",
          },
        });

        // 5. Create a ReviewQueueItem so the counselor is prompted to approve
        await prisma.reviewQueueItem.create({
          data: {
            counselorId: ctx.counselorId,
            entityType: "profile_extraction",
            entityId: doc.id,
            aiOutputId: aiOutput.id,
            title: `Profile extraction · ${student.firstName} ${student.lastName}`,
            summary: `${extraction.detectedDocType.toLowerCase()} — ${input.fileName}`,
          },
        });

        return { documentId: doc.id, detectedType: extraction.detectedDocType };
      } catch (err) {
        // Store the failure for diagnosis
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            extractionStatus: "FAILED",
            extractionError: err instanceof Error ? err.message : String(err),
          },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Upload saved, but AI extraction failed. Please try again.",
        });
      }
    }),

  /** Re-run extraction on a FAILED document without re-uploading the blob. */
  retryExtraction: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: {
          id: input.id,
          student: { counselorId: ctx.counselorId },
        },
        include: { student: true },
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (doc.extractionStatus !== "FAILED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only failed extractions can be retried",
        });
      }

      await prisma.document.update({
        where: { id: doc.id },
        data: { extractionStatus: "PROCESSING", extractionError: null },
      });

      try {
        const { extraction, usage } = await extractProfileFromDocument({
          fileUrl: doc.storageUrl,
          mimeType: doc.fileType,
          currentStudent: {
            firstName: doc.student.firstName,
            lastName: doc.student.lastName,
            hasGPA: doc.student.gpaUnweighted != null || doc.student.gpaWeighted != null,
            hasSAT: doc.student.satScore != null,
            hasACT: doc.student.actScore != null,
          },
        });

        const aiOutput = await createAIOutput({
          counselorId: ctx.counselorId,
          studentId: doc.studentId,
          feature: "profile_extraction",
          sourceBasis: [
            { type: "document", id: doc.id, label: `${extraction.detectedDocType} · ${doc.fileName}` },
            { type: "profile", id: doc.studentId, label: `${doc.student.firstName} ${doc.student.lastName}` },
          ],
          confidence: "MEDIUM",
          output: extraction,
          modelId: MODEL,
          tokenUsage: usage,
        });

        await prisma.document.update({
          where: { id: doc.id },
          data: {
            documentType: mapDocType(extraction.detectedDocType),
            structuredData: JSON.parse(JSON.stringify(extraction)),
            processedAt: new Date(),
            aiOutputId: aiOutput.id,
            extractionStatus: "READY",
          },
        });

        await prisma.reviewQueueItem.create({
          data: {
            counselorId: ctx.counselorId,
            entityType: "profile_extraction",
            entityId: doc.id,
            aiOutputId: aiOutput.id,
            title: `Profile extraction · ${doc.student.firstName} ${doc.student.lastName}`,
            summary: `${extraction.detectedDocType.toLowerCase()} — ${doc.fileName}`,
          },
        });

        return { detectedType: extraction.detectedDocType };
      } catch (err) {
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            extractionStatus: "FAILED",
            extractionError: err instanceof Error ? err.message : String(err),
          },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Extraction failed again. Please try later.",
        });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through the student chain
      const doc = await prisma.document.findFirst({
        where: {
          id: input.id,
          student: { counselorId: ctx.counselorId },
        },
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      // Delete the blob — swallow the error if it's already gone
      try {
        await deleteBlob(doc.storageUrl);
      } catch (err) {
        console.warn("Blob delete failed (continuing):", err);
      }

      // Remove all review queue items tied to this doc (entity is gone)
      await prisma.reviewQueueItem.deleteMany({
        where: {
          entityType: "profile_extraction",
          entityId: doc.id,
        },
      });

      await prisma.document.delete({ where: { id: doc.id } });
      return { ok: true };
    }),
});
