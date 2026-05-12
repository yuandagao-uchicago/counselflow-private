import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { verifyStudentOwnership } from "../lib/tenant";
import { SCHOLARSHIP_CATALOG } from "@/lib/scholarship/catalog";
import { DEFAULT_WEIGHTS, rankAll, type RankWeights, type Scholarship as RankScholarship } from "@/lib/scholarship/rank";
import { profileTagsFromStudent } from "@/lib/scholarship/profile";

async function verifySavedOwnership(counselorId: string, id: string) {
  const row = await prisma.savedScholarship.findFirst({
    where: { id, student: { counselorId } },
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Saved scholarship not found" });
  }
  return row;
}

const weightsSchema = z
  .object({
    eligibility: z.number().min(0).max(1),
    amount: z.number().min(0).max(1),
    deadline: z.number().min(0).max(1),
    effort: z.number().min(0).max(1),
  })
  .partial()
  .optional();

function mergeWeights(input: Partial<RankWeights> | undefined): RankWeights {
  return { ...DEFAULT_WEIGHTS, ...(input ?? {}) };
}

// Date conversion: catalog stores "YYYY-MM-DD" strings; Prisma stores Date.
function catalogToRanker(s: (typeof SCHOLARSHIP_CATALOG)[number]): RankScholarship {
  return { ...s };
}

export const scholarshipRouter = router({
  search: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        weights: weightsSchema,
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const student = await prisma.student.findFirst({
        where: { id: input.studentId, counselorId: ctx.counselorId },
        select: { id: true, gradeLevel: true, intendedMajors: true, interests: true },
      });
      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
      }

      const tags = profileTagsFromStudent(student);
      const weights = mergeWeights(input.weights);
      const ranked = rankAll(SCHOLARSHIP_CATALOG.map(catalogToRanker), { tags, weights });

      const saved = await prisma.savedScholarship.findMany({
        where: { studentId: input.studentId, catalogId: { not: null } },
        select: { catalogId: true, id: true, status: true },
      });
      const savedByCatalogId = new Map(saved.map((s) => [s.catalogId!, s]));

      return ranked.slice(0, input.limit).map((r) => ({
        ...r,
        saved: savedByCatalogId.get(r.scholarship.id) ?? null,
      }));
    }),

  listSaved: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);
      return prisma.savedScholarship.findMany({
        where: { studentId: input.studentId },
        orderBy: [{ status: "asc" }, { savedAt: "desc" }],
      });
    }),

  save: protectedProcedure
    .input(z.object({ studentId: z.string(), catalogId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);
      const entry = SCHOLARSHIP_CATALOG.find((s) => s.id === input.catalogId);
      if (!entry) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scholarship not in catalog" });
      }
      return prisma.savedScholarship.create({
        data: {
          studentId: input.studentId,
          catalogId: entry.id,
          title: entry.title,
          url: entry.url,
          amount: entry.amount,
          deadline: entry.deadline ? new Date(entry.deadline + "T00:00:00Z") : null,
          eligibilityTags: entry.eligibilityTags,
          requirements: entry.requirements,
          estimatedEffort: entry.estimatedEffort,
          description: entry.description,
          source: entry.source,
        },
      });
    }),

  addCustom: protectedProcedure
    .input(
      z.object({
        studentId: z.string(),
        title: z.string().trim().min(1).max(200),
        url: z.string().trim().url(),
        amount: z.number().nullable().optional(),
        deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        eligibilityTags: z.array(z.string().trim().min(1)).max(20).optional(),
        requirements: z.array(z.string().trim().min(1)).max(20).optional(),
        estimatedEffort: z.number().int().min(1).max(5),
        description: z.string().trim().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyStudentOwnership(ctx.counselorId, input.studentId);
      return prisma.savedScholarship.create({
        data: {
          studentId: input.studentId,
          catalogId: null,
          title: input.title,
          url: input.url,
          amount: input.amount ?? null,
          deadline: input.deadline ? new Date(input.deadline + "T00:00:00Z") : null,
          eligibilityTags: input.eligibilityTags ?? [],
          requirements: input.requirements ?? [],
          estimatedEffort: input.estimatedEffort,
          description: input.description,
          source: "custom",
        },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["INTERESTED", "APPLYING", "SUBMITTED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifySavedOwnership(ctx.counselorId, input.id);
      return prisma.savedScholarship.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  unsave: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifySavedOwnership(ctx.counselorId, input.id);
      await prisma.savedScholarship.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
