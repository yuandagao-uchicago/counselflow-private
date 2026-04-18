import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@clerk/nextjs/server";

export type Context = {
  userId: string | null;
};

export async function createContext(): Promise<Context> {
  const { userId } = await auth();
  return { userId };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      counselorId: ctx.userId,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);
