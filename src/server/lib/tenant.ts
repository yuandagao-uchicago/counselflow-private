import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export async function verifyStudentOwnership(
  counselorId: string,
  studentId: string
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, counselorId },
  });
  if (!student) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Student not found",
    });
  }
  return student;
}
