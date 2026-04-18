import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type Context = {
  session: Awaited<ReturnType<typeof auth.api.getSession>> | null;
};

export async function createContext(): Promise<Context> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return { session };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      counselorId: ctx.session.user.id,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);
