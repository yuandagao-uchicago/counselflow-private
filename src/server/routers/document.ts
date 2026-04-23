import { z } from "zod";
import { del as deleteBlob } from "@vercel/blob";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { verifyStudentOwnership } from "../lib/tenant";
import { extractProfileFromDocument } from "@/ai/prompts/profileExtraction";
import { createAIOutput } from "@/ai/provenance";
import { MODEL } from "@/ai/client";
import type { DocumentType } from "@prisma/client";

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
      const student = await verifyStudentOwnership(ctx.counselorId, input.studentId);

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
        throw new Error(
          `Upload saved, but AI extraction failed. ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
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
      if (!doc) throw new Error("Document not found");

      // Delete the blob — swallow the error if it's already gone
      try {
        await deleteBlob(doc.storageUrl);
      } catch (err) {
        console.warn("Blob delete failed (continuing):", err);
      }

      // Remove any pending review queue items tied to this doc
      await prisma.reviewQueueItem.deleteMany({
        where: {
          entityType: "profile_extraction",
          entityId: doc.id,
          status: "PENDING",
        },
      });

      await prisma.document.delete({ where: { id: doc.id } });
      return { ok: true };
    }),
});
