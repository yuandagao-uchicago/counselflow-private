import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

/**
 * Schools are global (not tenant-scoped) — same Stanford row is referenced by
 * every counselor's applications. This router handles search + on-the-fly
 * creation when a counselor adds a school we haven't seen before.
 */
export const schoolRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().default(""), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      const q = input.query.trim();
      const where = q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { commonName: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {};

      return prisma.school.findMany({
        where,
        take: input.limit,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          commonName: true,
          city: true,
          state: true,
          country: true,
        },
      });
    }),

  // Find an existing school by exact name+city+state, or create one.
  // Used by the "add application" flow when the counselor types a free-form
  // school name we don't yet have indexed.
  findOrCreate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().default("US"),
      }),
    )
    .mutation(async ({ input }) => {
      // The unique key is (name, city, state). Postgres treats nulls as
      // distinct, so normalize empty strings to null on the way in.
      const city = input.city?.trim() || null;
      const state = input.state?.trim() || null;

      const existing = await prisma.school.findFirst({
        where: { name: input.name, city, state },
      });
      if (existing) return existing;

      return prisma.school.create({
        data: {
          name: input.name.trim(),
          city,
          state,
          country: input.country,
        },
      });
    }),
});
