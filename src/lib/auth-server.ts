import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

export async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

/**
 * Ensure a User record exists in our DB for this Clerk user.
 * Called on first interaction (lazy sync).
 */
export async function ensureDbUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Unauthorized");

  return prisma.user.create({
    data: {
      id: userId,
      name:
        `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
        "Counselor",
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      image: clerkUser.imageUrl,
    },
  });
}
