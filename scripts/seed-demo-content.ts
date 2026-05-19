// Comprehensive demo seed for the MVP presentation. Idempotent — finds
// existing students by email, won't duplicate apps / recs / activities /
// tasks / meetings / scholarships that already match by their natural
// keys. Run with:
//   set -a && source .env.local && set +a && npx tsx scripts/seed-demo-content.ts

import { prisma } from "../src/lib/prisma";
import { addDays, subDays, setHours, setMinutes } from "date-fns";

// May 19, 2026 — today for the demo world.
const NOW = new Date("2026-05-19T15:00:00-05:00");

async function main() {
  const counselor = await prisma.user.findFirst({
    where: { email: "yuanda@uchicago.edu" },
    select: { id: true, name: true },
  });
  if (!counselor) {
    console.error("Counselor yuanda@uchicago.edu not found.");
    process.exit(1);
  }
  console.log(`Seeding demo content for counselor ${counselor.name} (${counselor.id})\n`);

  // ---------- Schools ----------
  const schools = await seedSchools();
  console.log(`Schools: ${Object.keys(schools).length} ready\n`);

  // ---------- Per-student bundles ----------
  const studs = await prisma.student.findMany({
    where: {
      counselorId: counselor.id,
      email: { contains: ".test@example.com" },
    },
    select: { id: true, firstName: true, lastName: true, email: true, phase: true },
  });
  const byName = Object.fromEntries(
    studs.map((s) => [`${s.firstName} ${s.lastName}`, s])
  );

  // Update phases to match May-2026 reality
  await prisma.student.updateMany({
    where: { id: { in: [byName["Maya Chen"]?.id, byName["Ana Rodriguez"]?.id].filter(Boolean) as string[] } },
    data: { phase: "DECISIONS" },
  });
  console.log("Phases updated: Maya + Ana → DECISIONS\n");

  // ---- MAYA (the showpiece) ----
  if (byName["Maya Chen"]) {
    await seedMaya(counselor.id, byName["Maya Chen"].id, schools);
    console.log("✓ Maya Chen — deep demo content seeded");
  }

  // ---- ANA (secondary deep student) ----
  if (byName["Ana Rodriguez"]) {
    await seedAna(counselor.id, byName["Ana Rodriguez"].id, schools);
    console.log("✓ Ana Rodriguez — applications + scholarships seeded");
  }

  // ---- JORDAN (junior strategy) ----
  if (byName["Jordan Patel"]) {
    await seedJordan(counselor.id, byName["Jordan Patel"].id);
    console.log("✓ Jordan Patel — junior-year tasks + activities seeded");
  }

  // ---- SAM (sophomore exploration) ----
  if (byName["Sam Whitfield"]) {
    await seedSam(counselor.id, byName["Sam Whitfield"].id);
    console.log("✓ Sam Whitfield — exploration tasks seeded");
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

// ===================================
// Schools (idempotent on name+city+state)
// ===================================
async function seedSchools() {
  const defs = [
    { name: "Stanford University", commonName: "Stanford", city: "Stanford", state: "CA", website: "https://www.stanford.edu", acceptanceRate: 0.04, medianSAT: 1535 },
    { name: "Massachusetts Institute of Technology", commonName: "MIT", city: "Cambridge", state: "MA", website: "https://www.mit.edu", acceptanceRate: 0.04, medianSAT: 1545 },
    { name: "Carnegie Mellon University", commonName: "CMU", city: "Pittsburgh", state: "PA", website: "https://www.cmu.edu", acceptanceRate: 0.11, medianSAT: 1510 },
    { name: "University of California, Berkeley", commonName: "UC Berkeley", city: "Berkeley", state: "CA", website: "https://www.berkeley.edu", acceptanceRate: 0.11, medianSAT: 1455 },
    { name: "University of Michigan", commonName: "Michigan", city: "Ann Arbor", state: "MI", website: "https://umich.edu", acceptanceRate: 0.18, medianSAT: 1465 },
    { name: "Georgia Institute of Technology", commonName: "Georgia Tech", city: "Atlanta", state: "GA", website: "https://www.gatech.edu", acceptanceRate: 0.16, medianSAT: 1470 },
    { name: "University of Illinois Chicago", commonName: "UIC", city: "Chicago", state: "IL", website: "https://www.uic.edu", acceptanceRate: 0.79, medianSAT: 1240 },
    { name: "Iowa State University", commonName: "Iowa State", city: "Ames", state: "IA", website: "https://www.iastate.edu", acceptanceRate: 0.90, medianSAT: 1180 },
    { name: "Northwestern University", commonName: "Northwestern", city: "Evanston", state: "IL", website: "https://www.northwestern.edu", acceptanceRate: 0.07, medianSAT: 1500 },
    { name: "University of Southern California", commonName: "USC", city: "Los Angeles", state: "CA", website: "https://www.usc.edu", acceptanceRate: 0.12, medianSAT: 1465 },
    { name: "New York University", commonName: "NYU", city: "New York", state: "NY", website: "https://www.nyu.edu", acceptanceRate: 0.13, medianSAT: 1490 },
    { name: "DePaul University", commonName: "DePaul", city: "Chicago", state: "IL", website: "https://www.depaul.edu", acceptanceRate: 0.71, medianSAT: 1230 },
    { name: "Loyola University Chicago", commonName: "Loyola Chicago", city: "Chicago", state: "IL", website: "https://www.luc.edu", acceptanceRate: 0.79, medianSAT: 1220 },
  ];
  const map: Record<string, { id: string; name: string }> = {};
  for (const d of defs) {
    const existing = await prisma.school.findFirst({
      where: { name: d.name, city: d.city, state: d.state },
      select: { id: true, name: true },
    });
    if (existing) {
      map[d.commonName] = existing;
      // Make sure website is set (older seed didn't populate it)
      await prisma.school.update({ where: { id: existing.id }, data: { website: d.website } });
    } else {
      const created = await prisma.school.create({
        data: { ...d, country: "US", type: "Private" },
        select: { id: true, name: true },
      });
      map[d.commonName] = created;
    }
  }
  return map;
}

// ===================================
// MAYA — the showpiece
// ===================================
async function seedMaya(
  counselorId: string,
  studentId: string,
  schools: Record<string, { id: string }>
) {
  // ---- Applications (May 2026: all submitted, results in) ----
  const apps: Array<{
    schoolKey: string;
    type: "RESTRICTIVE_EARLY_ACTION" | "REGULAR_DECISION";
    deadline: string; // ISO
    submittedAt: string;
    decisionDate: string;
    decision: "ACCEPTED" | "WAITLISTED" | "DENIED";
    status: "SUBMITTED";
  }> = [
    { schoolKey: "Stanford",     type: "RESTRICTIVE_EARLY_ACTION", deadline: "2025-11-01", submittedAt: "2025-10-30", decisionDate: "2025-12-12", decision: "WAITLISTED", status: "SUBMITTED" },
    { schoolKey: "MIT",          type: "REGULAR_DECISION",         deadline: "2026-01-01", submittedAt: "2025-12-26", decisionDate: "2026-03-14", decision: "ACCEPTED",   status: "SUBMITTED" },
    { schoolKey: "CMU",          type: "REGULAR_DECISION",         deadline: "2026-01-01", submittedAt: "2025-12-28", decisionDate: "2026-04-01", decision: "ACCEPTED",   status: "SUBMITTED" },
    { schoolKey: "UC Berkeley",  type: "REGULAR_DECISION",         deadline: "2025-11-30", submittedAt: "2025-11-25", decisionDate: "2026-03-27", decision: "ACCEPTED",   status: "SUBMITTED" },
    { schoolKey: "Michigan",     type: "REGULAR_DECISION",         deadline: "2026-02-01", submittedAt: "2026-01-15", decisionDate: "2026-03-25", decision: "ACCEPTED",   status: "SUBMITTED" },
    { schoolKey: "Georgia Tech", type: "REGULAR_DECISION",         deadline: "2026-01-04", submittedAt: "2025-12-28", decisionDate: "2026-03-08", decision: "DENIED",     status: "SUBMITTED" },
    { schoolKey: "UIC",          type: "ROLLING" as never,         deadline: "2026-02-01", submittedAt: "2025-12-01", decisionDate: "2026-02-10", decision: "ACCEPTED",   status: "SUBMITTED" },
    { schoolKey: "Iowa State",   type: "ROLLING" as never,         deadline: "2026-02-15", submittedAt: "2025-12-01", decisionDate: "2026-02-05", decision: "ACCEPTED",   status: "SUBMITTED" },
  ];

  for (const a of apps) {
    const school = schools[a.schoolKey];
    if (!school) continue;
    const existing = await prisma.application.findFirst({
      where: { studentId, schoolId: school.id, applicationType: a.type as never },
      select: { id: true },
    });
    if (existing) continue;
    const created = await prisma.application.create({
      data: {
        studentId,
        schoolId: school.id,
        applicationType: a.type as never,
        platform: "COMMON_APP",
        status: a.status,
        deadline: new Date(a.deadline + "T23:59:00-05:00"),
        submittedAt: new Date(a.submittedAt + "T20:00:00-05:00"),
        decisionDate: new Date(a.decisionDate + "T12:00:00-05:00"),
        decision: a.decision,
      },
      select: { id: true },
    });
    // Default requirement checklist — all done since submitted
    await seedRequirementItems(created.id, true);
  }

  // ---- Activities ----
  const activities = [
    {
      name: "FIRST Robotics Team 5817",
      category: "Academic",
      role: "Co-Captain · Software Lead",
      organization: "Lincoln Public HS Robotics",
      description:
        "Led the software subteam (8 students) building autonomous routines in Java for our 2024–25 competition robot. Regional winners 2025; mentored 12 middle-school FLL teams.",
      hoursPerWeek: 15,
      weeksPerYear: 38,
      yearsActive: "9, 10, 11, 12",
      honors: "Regional Champions 2025; Innovation in Control award.",
      significance: 1,
      sortOrder: 0,
    },
    {
      name: "Varsity Debate (Policy)",
      category: "Academic",
      role: "Team Captain",
      organization: "Lincoln Public HS Debate",
      description:
        "Two-time state champion in policy debate. Captain since 11th grade. Coach novices in research methodology and case construction.",
      hoursPerWeek: 10,
      weeksPerYear: 32,
      yearsActive: "9, 10, 11, 12",
      honors: "IL State Champion 2024 + 2025; NSDA Academic All-American.",
      significance: 2,
      sortOrder: 1,
    },
    {
      name: "Computational Oncology Research Internship",
      category: "Work / Volunteer",
      role: "Junior Research Assistant",
      organization: "Dr. Helen Kim Lab, Northwestern Feinberg",
      description:
        "Built Python pipelines for tumor-image classification. Co-author on poster (AACR 2026): \"Lightweight CNN ensembles for clinical pathology screening.\"",
      hoursPerWeek: 8,
      weeksPerYear: 30,
      yearsActive: "11, 12",
      honors: "AACR 2026 co-author.",
      significance: 3,
      sortOrder: 2,
    },
    {
      name: "Peer Tutoring (AP CS-A, AP Stats)",
      category: "Community Service",
      role: "Tutor",
      organization: "Lincoln HS Math Lab",
      description:
        "Twice-weekly small-group tutoring for ~30 underclassmen. Built a Python practice-problem generator that the math department adopted.",
      hoursPerWeek: 3,
      weeksPerYear: 32,
      yearsActive: "11, 12",
      significance: 6,
      sortOrder: 3,
    },
    {
      name: "Youth Symphony — Second Violin",
      category: "Arts",
      role: "Section Member",
      organization: "Chicago Youth Symphony",
      description: "Audition-based regional ensemble; 2 concerts per semester.",
      hoursPerWeek: 5,
      weeksPerYear: 34,
      yearsActive: "9, 10, 11, 12",
      significance: 7,
      sortOrder: 4,
    },
  ];
  for (const a of activities) {
    const existing = await prisma.activity.findFirst({
      where: { studentId, name: a.name },
      select: { id: true },
    });
    if (!existing) {
      await prisma.activity.create({ data: { ...a, studentId, significance: String(a.significance) } });
    }
  }

  // ---- Recommenders ----
  const recs = [
    {
      name: "Priya Patel",
      email: "ppatel@lincolnhs.k12.il.us",
      type: "TEACHER" as const,
      relationship: "AP Computer Science A · 11th grade",
      organization: "Lincoln Public High School",
      requestStatus: "SUBMITTED" as const,
      requestedAt: new Date("2025-09-15"),
      receivedAt: new Date("2025-10-18"),
      submittedAt: new Date("2025-10-20"),
      notes: "Wrote glowing letter focused on Maya's mentoring of underclassmen + the tumor-classification project.",
    },
    {
      name: "James Reed",
      email: "jreed@lincolnhs.k12.il.us",
      type: "TEACHER" as const,
      relationship: "Policy debate coach · 11th & 12th grade English",
      organization: "Lincoln Public High School",
      requestStatus: "SUBMITTED" as const,
      requestedAt: new Date("2025-09-22"),
      receivedAt: new Date("2025-11-14"),
      submittedAt: new Date("2025-11-15"),
      notes: "Slow to upload — needed a nudge on Nov 10. Final letter was strong, emphasized debate leadership + writing voice.",
    },
    {
      name: "Helen Kim, MD PhD",
      email: "helen.kim@northwestern.edu",
      type: "MENTOR" as const,
      relationship: "Research mentor · Computational Oncology Lab",
      organization: "Northwestern Feinberg School of Medicine",
      requestStatus: "SUBMITTED" as const,
      requestedAt: new Date("2025-10-01"),
      receivedAt: new Date("2025-12-08"),
      submittedAt: new Date("2025-12-10"),
      notes: "Supplemental research-mentor letter for MIT + Stanford. Spoke to technical depth + intellectual independence.",
    },
  ];
  for (const r of recs) {
    const existing = await prisma.studentRecommender.findFirst({
      where: { studentId, name: r.name },
      select: { id: true },
    });
    if (!existing) {
      await prisma.studentRecommender.create({ data: { ...r, studentId } });
    }
  }

  // ---- Saved scholarships ----
  const catalogScholarships = [
    { catalogId: "curated:002", title: "Gates Scholarship", url: "https://www.thegatesscholarship.org/", amount: null, deadline: new Date("2025-09-15"), eligibilityTags: ["undergraduate", "need-based", "minority", "high-school-senior"], requirements: ["essay", "transcript", "two-letters", "fafsa"], estimatedEffort: 4, description: "Last-dollar minority HS senior scholarship.", source: "curated", status: "APPLYING" as const, notes: "Submitted Sept 12. Maya is on the finalist short-list — interview April 8. Decision May ~25." },
    { catalogId: "curated:003", title: "Coca-Cola Scholars Program", url: "https://www.coca-colascholarsfoundation.org/", amount: 20000, deadline: new Date("2025-10-31"), eligibilityTags: ["undergraduate", "high-school-senior", "leadership", "community-service"], requirements: ["essay", "transcript"], estimatedEffort: 4, description: "Achievement-based, 150 HS seniors per year.", source: "curated", status: "SUBMITTED" as const, notes: "Submitted but didn't advance past semifinalist round. Closed out." },
    { catalogId: "curated:029", title: "National Merit Scholarship", url: "https://www.nationalmerit.org/", amount: 2500, deadline: new Date("2025-10-01"), eligibilityTags: ["undergraduate", "high-school-senior", "merit-based"], requirements: ["psat", "essay", "transcript"], estimatedEffort: 2, description: "PSAT-driven; ~7,500 selected nationally.", source: "curated", status: "SUBMITTED" as const, notes: "Semifinalist confirmed; Finalist letter received in Feb. Stanford-corporate sponsored." },
  ];
  for (const s of catalogScholarships) {
    const existing = await prisma.savedScholarship.findFirst({
      where: { studentId, catalogId: s.catalogId },
      select: { id: true },
    });
    if (!existing) {
      await prisma.savedScholarship.create({ data: { ...s, studentId } });
    }
  }

  // Custom local scholarship
  const customExisting = await prisma.savedScholarship.findFirst({
    where: { studentId, catalogId: null, title: "Lincoln Park Rotary First-Generation Award" },
    select: { id: true },
  });
  if (!customExisting) {
    await prisma.savedScholarship.create({
      data: {
        studentId,
        catalogId: null,
        title: "Lincoln Park Rotary First-Generation Award",
        url: "https://rotary-lincolnpark.org/scholarships",
        amount: 3000,
        deadline: new Date("2026-03-15"),
        eligibilityTags: ["first-gen", "undergraduate", "local"],
        requirements: ["essay", "two-letters", "fafsa"],
        estimatedEffort: 2,
        description: "Local Rotary chapter, prioritizes first-gen college students from Chicago Public Schools and partner districts.",
        source: "custom",
        status: "SUBMITTED" as const,
        notes: "Submitted March 10. Awarded April 22 — $3,000 confirmed, applied to fall tuition.",
      },
    });
  }

  // ---- Tasks ----
  const tasks = [
    {
      title: "Submit SIR (Statement of Intent to Register) to MIT",
      description: "MIT's enrollment deposit + SIR. National deposit deadline was May 1 — Maya committed April 28.",
      status: "COMPLETED" as const,
      priority: "URGENT" as const,
      source: "MANUAL" as const,
      dueDate: new Date("2026-05-01"),
      completedAt: new Date("2026-04-28"),
    },
    {
      title: "Decline Berkeley, CMU, Michigan, UIC, Iowa State offers",
      description: "Email each admissions office to formally decline. Frees up waitlist movement for other students.",
      status: "COMPLETED" as const,
      priority: "HIGH" as const,
      source: "MANUAL" as const,
      dueDate: new Date("2026-05-05"),
      completedAt: new Date("2026-05-02"),
    },
    {
      title: "Submit MIT housing preferences form",
      description: "Maya wants McCormick or Burton-Conner — both have wet labs + study lounges.",
      status: "IN_PROGRESS" as const,
      priority: "HIGH" as const,
      source: "MANUAL" as const,
      dueDate: new Date("2026-05-25"),
    },
    {
      title: "Reply to Stanford waitlist letter",
      description: "Maya wants to stay on the waitlist (low odds but free to do so). Send LOCI by June 1.",
      status: "TODO" as const,
      priority: "MEDIUM" as const,
      source: "MANUAL" as const,
      dueDate: new Date("2026-06-01"),
    },
    {
      title: "Schedule Gates Scholarship finalist interview prep",
      description: "Interview is May 27. Block two practice sessions: May 22 and May 25.",
      status: "IN_PROGRESS" as const,
      priority: "URGENT" as const,
      source: "MANUAL" as const,
      dueDate: new Date("2026-05-22"),
    },
    {
      title: "Send thank-you letters to Ms. Patel, Mr. Reed, Dr. Kim",
      description: "Handwritten notes — Maya already drafted, just needs to send.",
      status: "TODO" as const,
      priority: "MEDIUM" as const,
      source: "MANUAL" as const,
      dueDate: new Date("2026-05-30"),
    },
    {
      title: "Confirm MIT freshman pre-orientation program (Discover EECS)",
      description: "Application opens June 1. Maya is interested in Discover EECS.",
      status: "TODO" as const,
      priority: "LOW" as const,
      source: "MANUAL" as const,
      dueDate: new Date("2026-06-15"),
    },
    {
      title: "Summer plan: Dr. Kim lab continuation through August",
      description: "Maya is staying on at the Northwestern lab through August before MIT move-in. Hours: M-W-F, 9-3.",
      status: "WAITING_ON_EXTERNAL" as const,
      priority: "LOW" as const,
      source: "MANUAL" as const,
      dueDate: new Date("2026-06-01"),
    },
  ];
  for (const t of tasks) {
    const existing = await prisma.task.findFirst({
      where: { studentId, title: t.title },
      select: { id: true },
    });
    if (!existing) {
      await prisma.task.create({ data: { ...t, studentId, createdById: counselorId } });
    }
  }

  // ---- Meetings ----
  const meetings = [
    {
      scheduledAt: new Date("2025-10-24T16:30:00-05:00"),
      duration: 47,
      type: "REA Decision + Application Strategy",
      location: "Zoom",
      // No notes/transcript — user will paste it in to demo the AI summary
    },
    {
      scheduledAt: new Date("2025-11-08T09:00:00-06:00"),
      duration: 92,
      type: "CSS Profile Working Session",
      location: "In-person · counselor office",
      rawNotes: "Walked Maya + her mom through the CSS Profile. Resolved dad's business-income reporting. Submitted at 10:31am.",
    },
    {
      scheduledAt: new Date("2026-03-20T16:00:00-05:00"),
      duration: 45,
      type: "Acceptance Comparison + Aid Letter Review",
      location: "Zoom",
      rawNotes: "Reviewed MIT vs CMU vs Berkeley aid letters. MIT met 100% need at ~$5k/yr. CMU at $14k/yr. Berkeley at $8k/yr (with Cal Grant). Direction was already clearly MIT by tone.",
    },
    {
      scheduledAt: new Date("2026-04-15T16:00:00-05:00"),
      duration: 60,
      type: "Final Decision Conversation",
      location: "Zoom",
      rawNotes: "Committed to MIT. Discussed Stanford waitlist (Maya wants to stay on but accepts the realistic odds). Started transition-planning topics.",
    },
    // ---- Upcoming ----
    {
      scheduledAt: setMinutes(setHours(addDays(NOW, 3), 16), 0), // May 22, 4:00pm
      duration: 60,
      type: "Gates Scholarship Interview Prep (1 of 2)",
      location: "Zoom",
    },
    {
      scheduledAt: setMinutes(setHours(addDays(NOW, 6), 16), 0), // May 25, 4:00pm
      duration: 60,
      type: "Gates Scholarship Interview Prep (2 of 2)",
      location: "Zoom",
    },
    {
      scheduledAt: setMinutes(setHours(addDays(NOW, 14), 15), 30), // June 2, 3:30pm
      duration: 45,
      type: "MIT Pre-Orientation + Summer Logistics",
      location: "Zoom",
    },
  ];
  for (const m of meetings) {
    const existing = await prisma.meeting.findFirst({
      where: { studentId, scheduledAt: m.scheduledAt },
      select: { id: true },
    });
    if (!existing) {
      await prisma.meeting.create({ data: { ...m, studentId, counselorId } });
    }
  }
}

// ===================================
// ANA — secondary deep student
// ===================================
async function seedAna(
  counselorId: string,
  studentId: string,
  schools: Record<string, { id: string }>
) {
  const apps = [
    { schoolKey: "Northwestern",   type: "EARLY_DECISION",   deadline: "2025-11-01", submittedAt: "2025-10-29", decisionDate: "2025-12-13", decision: "DENIED",     status: "SUBMITTED" as const },
    { schoolKey: "USC",            type: "REGULAR_DECISION", deadline: "2026-01-15", submittedAt: "2025-12-15", decisionDate: "2026-03-24", decision: "ACCEPTED",   status: "SUBMITTED" as const },
    { schoolKey: "NYU",            type: "REGULAR_DECISION", deadline: "2026-01-05", submittedAt: "2025-12-22", decisionDate: "2026-03-30", decision: "WAITLISTED", status: "SUBMITTED" as const },
    { schoolKey: "DePaul",         type: "REGULAR_DECISION", deadline: "2026-02-01", submittedAt: "2025-12-30", decisionDate: "2026-03-01", decision: "ACCEPTED",   status: "SUBMITTED" as const },
    { schoolKey: "Loyola Chicago", type: "REGULAR_DECISION", deadline: "2026-02-01", submittedAt: "2025-12-30", decisionDate: "2026-02-25", decision: "ACCEPTED",   status: "SUBMITTED" as const },
    { schoolKey: "UIC",            type: "REGULAR_DECISION", deadline: "2026-02-01", submittedAt: "2025-12-12", decisionDate: "2026-02-08", decision: "ACCEPTED",   status: "SUBMITTED" as const },
  ];

  for (const a of apps) {
    const school = schools[a.schoolKey];
    if (!school) continue;
    const existing = await prisma.application.findFirst({
      where: { studentId, schoolId: school.id, applicationType: a.type as never },
      select: { id: true },
    });
    if (existing) continue;
    const created = await prisma.application.create({
      data: {
        studentId,
        schoolId: school.id,
        applicationType: a.type as never,
        platform: "COMMON_APP",
        status: a.status,
        deadline: new Date(a.deadline + "T23:59:00-05:00"),
        submittedAt: new Date(a.submittedAt + "T20:00:00-05:00"),
        decisionDate: new Date(a.decisionDate + "T12:00:00-05:00"),
        decision: a.decision,
      },
      select: { id: true },
    });
    await seedRequirementItems(created.id, true);
  }

  // Recommenders
  const recs = [
    {
      name: "Maria Hernandez",
      email: "mhernandez@eastsidecharter.org",
      type: "TEACHER" as const,
      relationship: "AP English Lit · 11th grade · Newspaper advisor",
      organization: "Eastside Charter",
      requestStatus: "SUBMITTED" as const,
      requestedAt: new Date("2025-09-20"),
      submittedAt: new Date("2025-10-25"),
    },
    {
      name: "Marcus Bell",
      email: "mbell@eastsidecharter.org",
      type: "TEACHER" as const,
      relationship: "AP US History · 11th grade",
      organization: "Eastside Charter",
      requestStatus: "SUBMITTED" as const,
      requestedAt: new Date("2025-09-22"),
      submittedAt: new Date("2025-11-02"),
    },
  ];
  for (const r of recs) {
    const existing = await prisma.studentRecommender.findFirst({
      where: { studentId, name: r.name },
      select: { id: true },
    });
    if (!existing) await prisma.studentRecommender.create({ data: { ...r, studentId } });
  }

  // Activities
  const activities = [
    { name: "Eastside Charter Newspaper", category: "Arts", role: "Editor-in-Chief", organization: "Eastside Charter", description: "Lead 14-person editorial team. Doubled monthly readership through investigative reporting on district policy.", hoursPerWeek: 12, weeksPerYear: 36, yearsActive: "10, 11, 12", honors: "IL Press Association High School Journalism Award 2025.", significance: "1", sortOrder: 0 },
    { name: "Chicago Youth Mayor's Council", category: "Community Service", role: "Communications Lead", organization: "City of Chicago", description: "Drafted policy briefs for the Mayor's Office on youth media access programs.", hoursPerWeek: 4, weeksPerYear: 30, yearsActive: "11, 12", significance: "2", sortOrder: 1 },
    { name: "Latina Empowerment Initiative", category: "Community Service", role: "Co-Founder", organization: "Eastside Charter", description: "Founded mentorship program pairing Latina HS students with college undergrads.", hoursPerWeek: 3, weeksPerYear: 32, yearsActive: "11, 12", significance: "3", sortOrder: 2 },
  ];
  for (const a of activities) {
    const existing = await prisma.activity.findFirst({ where: { studentId, name: a.name }, select: { id: true } });
    if (!existing) await prisma.activity.create({ data: { ...a, studentId } });
  }

  // Saved scholarship
  const sch = await prisma.savedScholarship.findFirst({
    where: { studentId, catalogId: "curated:005" },
    select: { id: true },
  });
  if (!sch) {
    await prisma.savedScholarship.create({
      data: {
        studentId,
        catalogId: "curated:005",
        title: "Hispanic Scholarship Fund General Scholarship",
        url: "https://www.hsf.net/scholarship",
        amount: 5000,
        deadline: new Date("2026-02-15"),
        eligibilityTags: ["hispanic", "undergraduate", "graduate", "merit-based"],
        requirements: ["essay", "transcript", "fafsa"],
        estimatedEffort: 3,
        description: "Awards $500–$5,000 to Hispanic-heritage students.",
        source: "curated",
        status: "SUBMITTED",
        notes: "Submitted Feb 8. Awarded $4,000 in April — applied to fall semester.",
      },
    });
  }

  // Tasks
  const tasks = [
    { title: "Submit SIR to USC", status: "COMPLETED" as const, priority: "URGENT" as const, source: "MANUAL" as const, dueDate: new Date("2026-05-01"), completedAt: new Date("2026-04-30"), description: "Ana committed to USC Annenberg." },
    { title: "Reply to NYU waitlist", status: "TODO" as const, priority: "MEDIUM" as const, source: "MANUAL" as const, dueDate: new Date("2026-06-01"), description: "Send LOCI. Ana wants to stay on the waitlist." },
    { title: "USC housing form", status: "IN_PROGRESS" as const, priority: "HIGH" as const, source: "MANUAL" as const, dueDate: new Date("2026-05-28") },
    { title: "Apply for USC's Norman Topping Scholars Program", status: "TODO" as const, priority: "MEDIUM" as const, source: "MANUAL" as const, dueDate: new Date("2026-06-15"), description: "First-gen program — additional ~$5k/yr + community." },
  ];
  for (const t of tasks) {
    const existing = await prisma.task.findFirst({ where: { studentId, title: t.title }, select: { id: true } });
    if (!existing) await prisma.task.create({ data: { ...t, studentId, createdById: counselorId } });
  }

  // Meetings
  const meetings = [
    { scheduledAt: new Date("2026-04-10T15:00:00-05:00"), duration: 50, type: "Acceptance Review + Decision", location: "Zoom" },
    { scheduledAt: setMinutes(setHours(addDays(NOW, 5), 15), 0), duration: 45, type: "USC Orientation + Norman Topping App", location: "Zoom" },
  ];
  for (const m of meetings) {
    const existing = await prisma.meeting.findFirst({ where: { studentId, scheduledAt: m.scheduledAt }, select: { id: true } });
    if (!existing) await prisma.meeting.create({ data: { ...m, studentId, counselorId } });
  }
}

// ===================================
// JORDAN — junior year strategy
// ===================================
async function seedJordan(counselorId: string, studentId: string) {
  const activities = [
    { name: "Volunteer EMT", category: "Work / Volunteer", role: "Certified EMT-B", organization: "Westwood Fire Dept Auxiliary", description: "EMT-B certified summer of 11th grade. ~150 service hours / year on weekends.", hoursPerWeek: 8, weeksPerYear: 40, yearsActive: "11", honors: "Eagle Scout 2024.", significance: "1", sortOrder: 0 },
    { name: "Varsity Soccer", category: "Athletics: JV/Varsity", role: "Co-Captain (rising senior)", organization: "Westwood Academy", description: "All-Conference midfielder.", hoursPerWeek: 12, weeksPerYear: 24, yearsActive: "9, 10, 11", significance: "3", sortOrder: 1 },
    { name: "Science Olympiad", category: "Academic", role: "Anatomy & Physiology Lead", organization: "Westwood Academy", description: "State regional gold 2025 (anatomy).", hoursPerWeek: 6, weeksPerYear: 28, yearsActive: "10, 11", significance: "4", sortOrder: 2 },
  ];
  for (const a of activities) {
    const existing = await prisma.activity.findFirst({ where: { studentId, name: a.name }, select: { id: true } });
    if (!existing) await prisma.activity.create({ data: { ...a, studentId } });
  }

  const tasks = [
    { title: "Build summer college visit shortlist (8 schools)", status: "IN_PROGRESS" as const, priority: "HIGH" as const, source: "MANUAL" as const, dueDate: new Date("2026-05-28"), description: "Mix of BS/MD programs + traditional pre-med routes. Northwestern HPME, Brown PLME, Pitt GAP, Rice Med-Scholars, Boston U SMED, Case Western PPSP, plus 2 traditional matches." },
    { title: "Schedule August SAT (last shot before senior year)", status: "TODO" as const, priority: "HIGH" as const, source: "MANUAL" as const, dueDate: new Date("2026-06-01"), description: "Current: 1480. Aim: 1530+ for BS/MD competitiveness." },
    { title: "Apply to Stanford Pre-Collegiate Studies (summer)", status: "WAITING_ON_EXTERNAL" as const, priority: "MEDIUM" as const, source: "MANUAL" as const, dueDate: new Date("2026-06-15") },
    { title: "Junior year transcripts ready (for counselor recs)", status: "TODO" as const, priority: "MEDIUM" as const, source: "MANUAL" as const, dueDate: new Date("2026-06-10") },
    { title: "Draft summer reading list — pre-med essays + Atul Gawande", status: "TODO" as const, priority: "LOW" as const, source: "MANUAL" as const, dueDate: new Date("2026-06-15") },
  ];
  for (const t of tasks) {
    const existing = await prisma.task.findFirst({ where: { studentId, title: t.title }, select: { id: true } });
    if (!existing) await prisma.task.create({ data: { ...t, studentId, createdById: counselorId } });
  }

  const meetings = [
    { scheduledAt: setMinutes(setHours(addDays(NOW, 2), 17), 0), duration: 60, type: "Junior-Year Strategy: BS/MD List Building", location: "Zoom" },
    { scheduledAt: setMinutes(setHours(addDays(NOW, 21), 16), 0), duration: 45, type: "Summer Plan + School Visit Itinerary", location: "Zoom" },
    { scheduledAt: subDays(NOW, 14), duration: 45, type: "Mid-Junior Check-In", location: "Zoom", rawNotes: "Discussed PSAT results (215, NMSQT commended), settled on pre-med focus, agreed to scout BS/MD." },
  ];
  for (const m of meetings) {
    const existing = await prisma.meeting.findFirst({ where: { studentId, scheduledAt: m.scheduledAt }, select: { id: true } });
    if (!existing) await prisma.meeting.create({ data: { ...m, studentId, counselorId } });
  }
}

// ===================================
// SAM — sophomore exploration
// ===================================
async function seedSam(counselorId: string, studentId: string) {
  const tasks = [
    { title: "Identify 3 engineering summer programs to apply to next year", status: "TODO" as const, priority: "MEDIUM" as const, source: "MANUAL" as const, dueDate: new Date("2026-08-15"), description: "Target programs: Purdue Summer College, Michigan WISE, Cooper Union STEAM." },
    { title: "Sign up for PSAT 10 prep", status: "TODO" as const, priority: "LOW" as const, source: "MANUAL" as const, dueDate: new Date("2026-09-01") },
    { title: "Read 'Skunk Works' + 'Soul of a New Machine' over the summer", status: "TODO" as const, priority: "LOW" as const, source: "MANUAL" as const, dueDate: new Date("2026-08-30") },
  ];
  for (const t of tasks) {
    const existing = await prisma.task.findFirst({ where: { studentId, title: t.title }, select: { id: true } });
    if (!existing) await prisma.task.create({ data: { ...t, studentId, createdById: counselorId } });
  }

  const meetings = [
    { scheduledAt: setMinutes(setHours(addDays(NOW, 10), 16), 0), duration: 30, type: "End-of-Year Check-In: Summer Planning", location: "Zoom" },
  ];
  for (const m of meetings) {
    const existing = await prisma.meeting.findFirst({ where: { studentId, scheduledAt: m.scheduledAt }, select: { id: true } });
    if (!existing) await prisma.meeting.create({ data: { ...m, studentId, counselorId } });
  }
}

// ===================================
// Application requirement checklist (mark all done for submitted apps)
// ===================================
async function seedRequirementItems(applicationId: string, allDone: boolean) {
  const items = [
    { kind: "APPLICATION_FORM",   label: "Application form",        derivationKey: "form",             sortOrder: 0 },
    { kind: "TRANSCRIPT",         label: "Official transcript",     derivationKey: "transcript",       sortOrder: 10 },
    { kind: "TEST_SCORES",        label: "Test scores (SAT/ACT)",   derivationKey: "test_scores",      sortOrder: 20 },
    { kind: "ACTIVITIES_LIST",    label: "Activities list",         derivationKey: "activities",       sortOrder: 30 },
    { kind: "COMMON_APP_ESSAY",   label: "Personal statement",      derivationKey: "common_app_essay", sortOrder: 40 },
    { kind: "RECOMMENDATION",     label: "Letter of recommendation #1", derivationKey: "recommendation:1", sortOrder: 50 },
    { kind: "RECOMMENDATION",     label: "Letter of recommendation #2", derivationKey: "recommendation:2", sortOrder: 51 },
    { kind: "SUPPLEMENT_ESSAY",   label: "School-specific supplement", derivationKey: "supplement",     sortOrder: 60 },
  ];
  for (const it of items) {
    const existing = await prisma.applicationRequirementItem.findFirst({
      where: { applicationId, derivationKey: it.derivationKey },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.applicationRequirementItem.create({
      data: {
        applicationId,
        ...it,
        kind: it.kind as never,
        required: true,
        status: allDone ? "DONE" : "PENDING",
        resolvedAt: allDone ? new Date() : null,
      },
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
