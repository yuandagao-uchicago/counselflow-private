// One-off script to seed test students for feature audit. Run with:
//   set -a && source .env.local && set +a && npx tsx scripts/seed-test-students.ts
// Idempotent: skips students whose email already exists for the counselor.

import { prisma } from "../src/lib/prisma";

async function main() {
  const counselors = await prisma.user.findMany({
    select: { id: true, email: true, name: true, _count: { select: { students: true } } },
  });
  if (counselors.length === 0) {
    console.error("No counselors in DB — sign in once to sync your Clerk user, then re-run.");
    process.exit(1);
  }
  console.log("Counselors:", JSON.stringify(counselors, null, 2));
  const counselor = counselors[0];
  console.log(`\nUsing counselor: ${counselor.email} (${counselor.id})\n`);

  const STUDENTS = [
    {
      firstName: "Maya",
      lastName: "Chen",
      email: "maya.chen.test@example.com",
      gradeLevel: "SENIOR" as const,
      graduationYear: 2026,
      highSchool: "Lincoln Public High School",
      gpaUnweighted: 3.92,
      gpaWeighted: 4.5,
      satScore: 1480,
      intendedMajors: ["Computer Science", "Statistics"],
      interests: ["robotics", "debate", "machine-learning"],
      personalNotes: "First-gen, eligible for need-based aid. Mom works at the hospital, dad small business. Interested in Stanford, MIT, CMU.",
      phase: "APPLICATIONS" as const,
      guardians: [
        { firstName: "Wei", lastName: "Chen", relationship: "Mother", email: "wei.chen.test@example.com", phone: "555-0101" },
      ],
    },
    {
      firstName: "Jordan",
      lastName: "Patel",
      email: "jordan.patel.test@example.com",
      gradeLevel: "JUNIOR" as const,
      graduationYear: 2027,
      highSchool: "Westwood Academy",
      gpaUnweighted: 3.78,
      gpaWeighted: 4.2,
      actScore: 32,
      intendedMajors: ["Biology", "Public Health"],
      interests: ["medicine", "community-service", "leadership"],
      personalNotes: "Aspiring physician. Volunteer EMT. Interested in BS/MD programs.",
      phase: "LIST_BUILDING" as const,
      guardians: [
        { firstName: "Anika", lastName: "Patel", relationship: "Mother", email: "anika.patel.test@example.com" },
        { firstName: "Raj", lastName: "Patel", relationship: "Father", email: "raj.patel.test@example.com" },
      ],
    },
    {
      firstName: "Ana",
      lastName: "Rodriguez",
      email: "ana.rodriguez.test@example.com",
      gradeLevel: "SENIOR" as const,
      graduationYear: 2026,
      highSchool: "Eastside Charter",
      gpaUnweighted: 3.65,
      intendedMajors: ["Journalism", "Political Science"],
      interests: ["writing", "media", "activism"],
      personalNotes: "Hispanic, first-gen. Strong writer, school newspaper editor. Need-based aid required.",
      phase: "APPLICATIONS" as const,
      guardians: [
        { firstName: "Carmen", lastName: "Rodriguez", relationship: "Mother", email: "carmen.rodriguez.test@example.com" },
      ],
    },
    {
      firstName: "Sam",
      lastName: "Whitfield",
      email: "sam.whitfield.test@example.com",
      gradeLevel: "SOPHOMORE" as const,
      graduationYear: 2028,
      highSchool: "Brookfield High",
      gpaUnweighted: 3.55,
      intendedMajors: ["Mechanical Engineering"],
      interests: ["robotics", "physics", "soccer"],
      personalNotes: "Early in process. Strong in math, less so in English. Will need writing support.",
      phase: "EXPLORATION" as const,
      // Intentionally NO guardian to test the guardian-required path
      guardians: [],
    },
  ];

  let created = 0;
  let skipped = 0;
  for (const s of STUDENTS) {
    const existing = await prisma.student.findFirst({
      where: { counselorId: counselor.id, email: s.email },
      select: { id: true, firstName: true, lastName: true },
    });
    if (existing) {
      console.log(`  - skip: ${s.firstName} ${s.lastName} (already exists, id=${existing.id})`);
      skipped++;
      continue;
    }
    const { guardians, ...studentData } = s;
    const student = await prisma.student.create({
      data: {
        counselorId: counselor.id,
        ...studentData,
        guardians: { create: guardians },
      },
      select: { id: true },
    });
    console.log(`  + created: ${s.firstName} ${s.lastName} (id=${student.id}, ${guardians.length} guardian(s))`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
