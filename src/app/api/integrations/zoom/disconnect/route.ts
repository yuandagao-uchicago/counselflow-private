import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.integration.deleteMany({
    where: { counselorId: userId, provider: "zoom" },
  });

  return NextResponse.json({ ok: true });
}
