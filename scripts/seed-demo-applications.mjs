/**
 * One-off seed script for the readiness demo. Idempotent on schools (uses
 * findOrCreate semantics by name+city+state). Does NOT wipe existing data —
 * just adds students + apps so the dashboard lights up.
 *
 * Run:  node scripts/seed-demo-applications.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COUNSELOR_ID = "user_3CVdvQhaI5cF91yGwBVA3YD4k7N"; // Yuanda

// ---- Helpers ----

async function findOrCreateSchool({ name, city, state }) {
  const existing = await prisma.school.findFirst({ where: { name, city, state } });
  if (existing) return existing;
  return prisma.school.create({ data: { name, city, state, country: "US" } });
}

function defaultChecklistItems({ recCount = 2, hasSupplement = true } = {}) {
  const items = [
    { kind: "APPLICATION_FORM", label: "Application form", required: true, derivationKey: "form", sortOrder: 0 },
    { kind: "TRANSCRIPT", label: "Official transcript", required: true, derivationKey: "transcript", sortOrder: 10 },
    { kind: "TEST_SCORES", label: "Test scores (SAT / ACT)", required: false, derivationKey: "test_scores", sortOrder: 20 },
    { kind: "ACTIVITIES_LIST", label: "Activities list", required: true, derivationKey: "activities", sortOrder: 30 },
    { kind: "COMMON_APP_ESSAY", label: "Personal statement", required: true, derivationKey: "common_app_essay", sortOrder: 40 },
  ];
  for (let i = 0; i < recCount; i++) {
    items.push({
      kind: "RECOMMENDATION",
      label: `Letter of recommendation #${i + 1}`,
      required: true,
      derivationKey: `recommendation:${i + 1}`,
      sortOrder: 50 + i,
    });
  }
  if (hasSupplement) {
    items.push({
      kind: "SUPPLEMENT_ESSAY",
      label: "School-specific supplement",
      required: true,
      derivationKey: "supplement",
      sortOrder: 80,
    });
  }
  return items;
}

async function createApplication({
  studentId,
  schoolId,
  applicationType,
  platform,
  deadline,
  status = "PLANNING",
  submittedAt = null,
  recCount = 2,
  hasSupplement = true,
  // Pre-mark some checklist items DONE to vary the readiness picture
  // beyond what auto-derivation alone gives us.
  markDoneKinds = [],
}) {
  // dedupe by the (student, school, type) unique
  const existing = await prisma.application.findFirst({
    where: { studentId, schoolId, applicationType },
  });
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        studentId,
        schoolId,
        applicationType,
        platform,
        deadline,
        status,
        submittedAt,
      },
    });

    const items = defaultChecklistItems({ recCount, hasSupplement });
    for (const it of items) {
      const isDone = markDoneKinds.includes(it.kind);
      await tx.applicationRequirementItem.create({
        data: {
          applicationId: app.id,
          kind: it.kind,
          label: it.label,
          required: it.required,
          derivationKey: it.derivationKey,
          sortOrder: it.sortOrder,
          status: isDone ? "DONE" : "PENDING",
          resolvedAt: isDone ? new Date() : null,
        },
      });
    }
    return app;
  });
}

async function createStudent(s) {
  // Skip if same first+last already exists for this counselor
  const existing = await prisma.student.findFirst({
    where: { counselorId: COUNSELOR_ID, firstName: s.firstName, lastName: s.lastName },
  });
  if (existing) return existing;
  return prisma.student.create({
    data: { ...s, counselorId: COUNSELOR_ID },
  });
}

// ---- Main ----

async function main() {
  console.log("Seeding schools…");
  const stanford = await findOrCreateSchool({ name: "Stanford University", city: "Stanford", state: "CA" });
  const mit = await findOrCreateSchool({ name: "MIT", city: "Cambridge", state: "MA" });
  const yale = await findOrCreateSchool({ name: "Yale University", city: "New Haven", state: "CT" });
  const cornell = await findOrCreateSchool({ name: "Cornell University", city: "Ithaca", state: "NY" });
  const ucla = await findOrCreateSchool({ name: "UCLA", city: "Los Angeles", state: "CA" });
  const usc = await findOrCreateSchool({ name: "USC", city: "Los Angeles", state: "CA" });
  const berkeley = await findOrCreateSchool({ name: "UC Berkeley", city: "Berkeley", state: "CA" });
  const tufts = await findOrCreateSchool({ name: "Tufts University", city: "Medford", state: "MA" });
  const nyu = await findOrCreateSchool({ name: "New York University", city: "New York", state: "NY" });
  const harveymudd = await findOrCreateSchool({ name: "Harvey Mudd College", city: "Claremont", state: "CA" });
  const northeastern = await findOrCreateSchool({ name: "Northeastern University", city: "Boston", state: "MA" });

  console.log("Seeding students…");

  // Maya — top-of-class, mostly ready. Has scores + transcript on file, several activities.
  const maya = await createStudent({
    firstName: "Maya",
    lastName: "Chen",
    email: "maya.chen@example.com",
    gradeLevel: "SENIOR",
    graduationYear: 2027,
    highSchool: "Lincoln High School",
    gpaUnweighted: 3.94,
    gpaWeighted: 4.42,
    satScore: 1540,
    intendedMajors: ["Computer Science"],
    interests: ["robotics", "creative writing"],
    phase: "APPLICATIONS",
  });

  // Diego — moving fast, no scores yet.
  const diego = await createStudent({
    firstName: "Diego",
    lastName: "Ramirez",
    email: "diego.r@example.com",
    gradeLevel: "JUNIOR",
    graduationYear: 2027,
    highSchool: "Roosevelt High",
    gpaUnweighted: 3.7,
    gpaWeighted: 4.05,
    intendedMajors: ["Mechanical Engineering"],
    interests: ["car restoration", "soccer"],
    phase: "TESTING",
  });

  // Aisha — senior applying broadly, an REA missed.
  const aisha = await createStudent({
    firstName: "Aisha",
    lastName: "Patel",
    email: "aisha.patel@example.com",
    gradeLevel: "SENIOR",
    graduationYear: 2027,
    highSchool: "Westview Prep",
    gpaUnweighted: 3.85,
    gpaWeighted: 4.3,
    satScore: 1480,
    actScore: 33,
    intendedMajors: ["Biology", "Public Health"],
    interests: ["global health", "debate"],
    phase: "APPLICATIONS",
  });

  // Jordan — behind schedule, big multi-school list.
  const jordan = await createStudent({
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan.l@example.com",
    gradeLevel: "SENIOR",
    graduationYear: 2027,
    highSchool: "Bay Area Academy",
    gpaUnweighted: 3.6,
    gpaWeighted: 3.95,
    satScore: 1380,
    intendedMajors: ["Business", "Economics"],
    interests: ["startups", "basketball"],
    phase: "APPLICATIONS",
  });

  // Give Maya + Aisha a transcript document so the readiness engine
  // auto-resolves their TRANSCRIPT items.
  for (const studentId of [maya.id, aisha.id]) {
    const has = await prisma.document.findFirst({
      where: { studentId, documentType: "TRANSCRIPT" },
    });
    if (!has) {
      await prisma.document.create({
        data: {
          studentId,
          fileName: "official-transcript.pdf",
          fileType: "application/pdf",
          fileSize: 124_000,
          documentType: "TRANSCRIPT",
          storageUrl: "https://example.com/seed/transcript.pdf",
          storageKey: `seed/${studentId}/transcript.pdf`,
          extractionStatus: "APPLIED",
        },
      });
    }
  }

  // Give Maya 9 activities so ACTIVITIES_LIST auto-resolves to DONE.
  const mayaActivityCount = await prisma.activity.count({ where: { studentId: maya.id } });
  if (mayaActivityCount === 0) {
    await prisma.activity.createMany({
      data: [
        { studentId: maya.id, name: "FIRST Robotics", category: "STEM", role: "Captain", hoursPerWeek: 12, sortOrder: 0 },
        { studentId: maya.id, name: "School Newspaper", category: "Journalism", role: "Editor", hoursPerWeek: 6, sortOrder: 1 },
        { studentId: maya.id, name: "Math Olympiad", category: "Academic", role: "Member", hoursPerWeek: 4, sortOrder: 2 },
        { studentId: maya.id, name: "Hospital Volunteer", category: "Service", role: "Volunteer", hoursPerWeek: 5, sortOrder: 3 },
        { studentId: maya.id, name: "Coding Club", category: "STEM", role: "Treasurer", hoursPerWeek: 3, sortOrder: 4 },
        { studentId: maya.id, name: "Track & Field", category: "Athletics", role: "Athlete", hoursPerWeek: 8, sortOrder: 5 },
        { studentId: maya.id, name: "Tutoring", category: "Service", role: "Tutor", hoursPerWeek: 4, sortOrder: 6 },
        { studentId: maya.id, name: "Summer Internship — Local Startup", category: "Work", role: "Intern", hoursPerWeek: 30, weeksPerYear: 8, sortOrder: 7 },
        { studentId: maya.id, name: "Piano", category: "Arts", role: "Performer", hoursPerWeek: 5, sortOrder: 8 },
      ],
    });
  }

  console.log("Seeding applications…");

  // Maya — varied bucket mix. Stanford SUBMITTED. MIT/Harvey Mudd UPCOMING.
  await createApplication({
    studentId: maya.id, schoolId: stanford.id,
    applicationType: "REGULAR_DECISION", platform: "COMMON_APP",
    deadline: new Date("2026-01-05"),
    status: "SUBMITTED",
    submittedAt: new Date("2026-01-03T17:00:00Z"),
    recCount: 3, hasSupplement: true,
    markDoneKinds: ["RECOMMENDATION"],
  });
  await createApplication({
    studentId: maya.id, schoolId: mit.id,
    applicationType: "REGULAR_DECISION", platform: "COMMON_APP",
    deadline: new Date("2026-06-15"),
    status: "IN_PROGRESS",
    recCount: 2, hasSupplement: true,
  });
  await createApplication({
    studentId: maya.id, schoolId: harveymudd.id,
    applicationType: "REGULAR_DECISION", platform: "COMMON_APP",
    deadline: new Date("2026-06-30"),
    status: "PLANNING",
    recCount: 2, hasSupplement: true,
  });

  // Diego — upcoming UCLA, USC. No scores → TEST_SCORES not done (it's optional anyway).
  await createApplication({
    studentId: diego.id, schoolId: ucla.id,
    applicationType: "REGULAR_DECISION", platform: "UC_APPLICATION",
    deadline: new Date("2026-06-20"),
    status: "PLANNING",
    recCount: 0, hasSupplement: false,
  });
  await createApplication({
    studentId: diego.id, schoolId: usc.id,
    applicationType: "REGULAR_DECISION", platform: "COMMON_APP",
    deadline: new Date("2026-07-05"),
    status: "PLANNING",
    recCount: 2, hasSupplement: true,
  });

  // Aisha — Yale REA OVERDUE (deadline passed). Cornell upcoming. Northeastern normal.
  await createApplication({
    studentId: aisha.id, schoolId: yale.id,
    applicationType: "RESTRICTIVE_EARLY_ACTION", platform: "COMMON_APP",
    deadline: new Date("2026-04-15"), // ~3 weeks ago
    status: "IN_PROGRESS",
    recCount: 2, hasSupplement: true,
  });
  await createApplication({
    studentId: aisha.id, schoolId: cornell.id,
    applicationType: "REGULAR_DECISION", platform: "COMMON_APP",
    deadline: new Date("2026-06-10"),
    status: "IN_PROGRESS",
    recCount: 2, hasSupplement: true,
    markDoneKinds: ["COMMON_APP_ESSAY"],
  });
  await createApplication({
    studentId: aisha.id, schoolId: northeastern.id,
    applicationType: "REGULAR_DECISION", platform: "COMMON_APP",
    deadline: new Date("2026-11-15"),
    status: "PLANNING",
    recCount: 2, hasSupplement: false,
  });

  // Jordan — Tufts + NYU DUE SOON. Berkeley upcoming.
  await createApplication({
    studentId: jordan.id, schoolId: tufts.id,
    applicationType: "REGULAR_DECISION", platform: "COMMON_APP",
    deadline: new Date("2026-05-12"), // ~8d
    status: "IN_PROGRESS",
    recCount: 2, hasSupplement: true,
  });
  await createApplication({
    studentId: jordan.id, schoolId: nyu.id,
    applicationType: "REGULAR_DECISION", platform: "COMMON_APP",
    deadline: new Date("2026-05-16"), // ~12d
    status: "IN_PROGRESS",
    recCount: 2, hasSupplement: true,
  });
  await createApplication({
    studentId: jordan.id, schoolId: berkeley.id,
    applicationType: "REGULAR_DECISION", platform: "UC_APPLICATION",
    deadline: new Date("2026-06-25"),
    status: "PLANNING",
    recCount: 0, hasSupplement: false,
  });

  console.log("Done.");
  const totals = await prisma.$transaction([
    prisma.student.count({ where: { counselorId: COUNSELOR_ID } }),
    prisma.application.count({ where: { student: { counselorId: COUNSELOR_ID } } }),
    prisma.applicationRequirementItem.count({
      where: { application: { student: { counselorId: COUNSELOR_ID } } },
    }),
    prisma.school.count(),
  ]);
  console.log({ students: totals[0], applications: totals[1], requirementItems: totals[2], schools: totals[3] });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
