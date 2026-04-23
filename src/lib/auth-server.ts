import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

/**
 * Ensure a User record exists in our DB for this Clerk user.
 * Called on first interaction (lazy sync). Uses upsert so concurrent
 * first-login requests don't race into a unique-constraint violation.
 */
export async function ensureDbUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthorized");

  const name =
    `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
    "Counselor";
  const email = clerkUser.emailAddresses[0]?.emailAddress || "";

  return prisma.user.upsert({
    where: { id: userId },
    // If a parallel request won the insert race, don't clobber their row.
    update: {},
    create: {
      id: userId,
      name,
      email,
      image: clerkUser.imageUrl,
    },
  });
}
