// Round 2 of demo seeding — six more students with distinct backgrounds,
// plus pending review-queue items, meeting requests, and risk flags so the
// dashboard / approvals / scheduling inbox all light up. Idempotent.
//
// Run with:
//   set -a && source .env.local && set +a && npx tsx scripts/seed-demo-extra.ts

import { prisma } from "../src/lib/prisma";
import { randomBytes } from "crypto";
import { addDays, addHours } from "date-fns";

const NOW = new Date("2026-05-19T15:00:00-05:00");
const COUNSELOR_EMAIL = "yuanda@uchicago.edu";

async function main() {
  const counselor = await prisma.user.findFirst({
    where: { email: COUNSELOR_EMAIL },
    select: { id: true },
  });
  if (!counselor) {
    console.error(`Counselor ${COUNSELOR_EMAIL} not found.`);
    process.exit(1);
  }

  // ---------- New students ----------
  const newStudents = await seedNewStudents(counselor.id);
  console.log(`Students: ${newStudents.length} processed\n`);

  // Need a couple known students from round 1 to attach pending items
  const maya = await prisma.student.findFirst({
    where: { counselorId: counselor.id, email: "maya.chen.test@example.com" },
    select: { id: true, firstName: true, lastName: true, guardians: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  const ana = await prisma.student.findFirst({
    where: { counselorId: counselor.id, email: "ana.rodriguez.test@example.com" },
    select: { id: true, firstName: true, lastName: true, guardians: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  const sam = await prisma.student.findFirst({
    where: { counselorId: counselor.id, email: "sam.whitfield.test@example.com" },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  // ---------- Pending review queue items ----------
  await seedReviewQueue(counselor.id, { maya, ana, lily: newStudents.find((s) => s.firstName === "Lily")!, kofi: newStudents.find((s) => s.firstName === "Kofi")! });
  console.log("✓ Review queue: 5 PENDING items added (drafts awaiting your approval)");

  // ---------- Meeting requests (pending) ----------
  await seedMeetingRequests(counselor.id, {
    sam,
    aisha: newStudents.find((s) => s.firstName === "Aisha")!,
    tyler: newStudents.find((s) => s.firstName === "Tyler")!,
  });
  console.log("✓ Meeting requests: 3 added (1 awaiting, 1 counter-proposed, 1 reminded)");

  // ---------- Risk flags ----------
  await seedRiskFlags(counselor.id, {
    maya,
    aisha: newStudents.find((s) => s.firstName === "Aisha")!,
    kofi: newStudents.find((s) => s.firstName === "Kofi")!,
    tyler: newStudents.find((s) => s.firstName === "Tyler")!,
  });
  console.log("✓ Risk flags: 4 added across students");

  console.log("\nDone.");
  await prisma.$disconnect();
}

// =============================================
// NEW STUDENTS
// =============================================
async function seedNewStudents(counselorId: string) {
  const defs = [
    {
      firstName: "Marcus", lastName: "Johnson",
      email: "marcus.johnson.test@example.com",
      preferredName: "Marcus", phone: "773-555-0188",
      gradeLevel: "SENIOR" as const, graduationYear: 2026,
      highSchool: "Whitney Young Magnet HS",
      gpaUnweighted: 3.74, gpaWeighted: 4.32, satScore: 1390,
      classRank: "38/420", courseRigor: "Most demanding (8 APs)",
      intendedMajors: ["Business Administration", "Sports Management"],
      interests: ["basketball", "entrepreneurship", "finance"],
      personalNotes: "Recruited D1 basketball — committed to Duke as preferred walk-on. Maintains rigorous academics. Parents own a logistics business; family income middle-class, will need merit aid for non-Duke options. Already deposited.",
      phase: "ENROLLMENT" as const,
      guardians: [
        { firstName: "Denise", lastName: "Johnson", relationship: "Mother", email: "denise.johnson.test@example.com", phone: "773-555-0189" },
        { firstName: "Marcus Sr.", lastName: "Johnson", relationship: "Father", email: "marcus.sr.test@example.com" },
      ],
    },
    {
      firstName: "Aisha", lastName: "Khan",
      email: "aisha.khan.test@example.com",
      preferredName: "Aisha", phone: "312-555-0167",
      gradeLevel: "SENIOR" as const, graduationYear: 2026,
      highSchool: "Walter Payton College Prep",
      gpaUnweighted: 3.98, gpaWeighted: 4.78, satScore: 1530,
      classRank: "4/200", courseRigor: "Most demanding (11 APs, 2 dual-enrollment)",
      intendedMajors: ["International Relations", "Arabic Studies"],
      interests: ["foreign-policy", "model-un", "debate", "humanitarian-work"],
      personalNotes: "Posse Scholar finalist for Pomona. Pakistani-American, second-gen American. Family income ~$48k. Applied to Georgetown SFS, Tufts, Pomona (Posse), Bowdoin, Williams, UChicago. Backup plan thin — Posse decision is everything.",
      phase: "SUBMISSIONS" as const,
      guardians: [
        { firstName: "Fatima", lastName: "Khan", relationship: "Mother", email: "fatima.khan.test@example.com", phone: "312-555-0168" },
      ],
    },
    {
      firstName: "Lily", lastName: "Tanaka",
      email: "lily.tanaka.test@example.com",
      preferredName: "Lily", phone: "847-555-0143",
      gradeLevel: "JUNIOR" as const, graduationYear: 2027,
      highSchool: "Evanston Township HS",
      gpaUnweighted: 3.81, gpaWeighted: 4.21, actScore: 31,
      courseRigor: "Strong (7 APs by graduation)",
      intendedMajors: ["Architecture", "Studio Art"],
      interests: ["architecture", "ceramics", "urban-design", "drawing"],
      personalNotes: "Building portfolio for RISD, Cooper Union, Pratt, Yale Art. Plans summer architecture intensive at SAIC. Japanese-American, mother is structural engineer. Comfortable upper-middle-class.",
      phase: "TESTING" as const,
      guardians: [
        { firstName: "Hana", lastName: "Tanaka", relationship: "Mother", email: "hana.tanaka.test@example.com" },
      ],
    },
    {
      firstName: "Naomi", lastName: "Goldberg",
      email: "naomi.goldberg.test@example.com",
      preferredName: "Naomi", phone: "847-555-0112",
      gradeLevel: "SENIOR" as const, graduationYear: 2026,
      highSchool: "New Trier HS",
      gpaUnweighted: 3.95, gpaWeighted: 4.65, satScore: 1490,
      classRank: "12/950", courseRigor: "Most demanding (10 APs)",
      intendedMajors: ["Neuroscience", "Theater"],
      interests: ["theater", "neuroscience", "improv", "musical-theater"],
      personalNotes: "Northwestern REA admit — Henry Crown Scholar (full merit). Committed April 8. Plans to double major. Voice training continues through summer. Parents are both physicians; comfortable affluent.",
      phase: "ENROLLMENT" as const,
      guardians: [
        { firstName: "Sarah", lastName: "Goldberg", relationship: "Mother", email: "sarah.goldberg.test@example.com" },
        { firstName: "David", lastName: "Goldberg", relationship: "Father", email: "david.goldberg.test@example.com" },
      ],
    },
    {
      firstName: "Kofi", lastName: "Asante",
      email: "kofi.asante.test@example.com",
      preferredName: "Kofi", phone: "+233-24-555-0234",
      gradeLevel: "SENIOR" as const, graduationYear: 2026,
      highSchool: "SOS-Hermann Gmeiner International College, Ghana",
      gpaUnweighted: 3.96, satScore: 1510,
      courseRigor: "IB Diploma (predicted 42/45)",
      intendedMajors: ["Computer Engineering", "Robotics"],
      interests: ["robotics", "machine-learning", "embedded-systems", "soccer"],
      personalNotes: "Ghanaian national applying to US (MIT, Stanford, CMU) + UK (Cambridge, Imperial). Built solar-powered water sensors deployed in three village schools. Family middle-income by Ghanaian standards; needs near-full aid for US schools. No domestic-US safety — decision day is everything.",
      phase: "DECISIONS" as const,
      guardians: [
        { firstName: "Kwame", lastName: "Asante", relationship: "Father", email: "kwame.asante.test@example.com" },
      ],
    },
    {
      firstName: "Tyler", lastName: "O'Brien",
      email: "tyler.obrien.test@example.com",
      preferredName: "Tyler", phone: "510-555-0298",
      gradeLevel: "TRANSFER" as const, graduationYear: 2028,
      highSchool: "Community college: Diablo Valley College (CA)",
      gpaUnweighted: 3.88,
      intendedMajors: ["Environmental Science", "Public Policy"],
      interests: ["climate-policy", "field-research", "kayaking", "bird-banding"],
      personalNotes: "Community college sophomore applying to transfer for fall 2026 (UC Berkeley, UCLA, UC Santa Barbara, UCSB Bren, UC Davis). Took two years off after HS for AmeriCorps trail crew work in the Sierras. Wildfire-shaped career thesis. First-gen.",
      phase: "APPLICATIONS" as const,
      guardians: [], // Adult transfer, no guardian
    },
  ];

  const created: Array<{ id: string; firstName: string; lastName: string }> = [];
  for (const def of defs) {
    const existing = await prisma.student.findFirst({
      where: { counselorId, email: def.email },
      select: { id: true, firstName: true, lastName: true },
    });
    if (existing) {
      console.log(`  - skip: ${def.firstName} ${def.lastName} (exists)`);
      created.push(existing);
      continue;
    }
    const { guardians, ...studentData } = def;
    const stu = await prisma.student.create({
      data: {
        counselorId,
        ...studentData,
        guardians: { create: guardians },
      },
      select: { id: true, firstName: true, lastName: true },
    });
    console.log(`  + created: ${def.firstName} ${def.lastName} [${def.phase}] · ${guardians.length} guardian(s)`);
    created.push(stu);
  }
  return created;
}

// =============================================
// REVIEW QUEUE — pending drafts/extractions awaiting approval
// =============================================
async function seedReviewQueue(
  counselorId: string,
  students: {
    maya: { id: string; firstName: string; lastName: string; guardians: { id: string; firstName: string; lastName: string; email: string | null }[] } | null;
    ana: { id: string; firstName: string; lastName: string; guardians: { id: string; firstName: string; lastName: string; email: string | null }[] } | null;
    lily: { id: string; firstName: string };
    kofi: { id: string; firstName: string };
  }
) {
  // 1. Weekly update draft for Maya's mom — Gates interview heads-up
  if (students.maya) {
    const guardian = students.maya.guardians[0];
    await seedWeeklyUpdate({
      counselorId,
      studentId: students.maya.id,
      studentName: "Maya Chen",
      guardianId: guardian?.id ?? null,
      guardianName: guardian?.firstName ?? "Parent",
      guardianEmail: guardian?.email ?? "wei.chen.test@example.com",
      audience: "PARENT",
      subject: "Maya's week — Gates Scholarship interview prep is on",
      body:
        "Hi Wei,\n\nQuick update on Maya's week. She finished her MIT housing preferences (McCormick is her top pick). She's also gearing up for her Gates Scholarship finalist interview next Wednesday — we have two practice sessions scheduled (Friday May 22 and Monday May 25). She's nervous but well-prepared.\n\nThis week's wins:\n• MIT enrollment fully confirmed; deposit cleared April 28\n• Local Rotary First-Gen Award officially confirmed at $3,000\n• Decline letters sent to Berkeley, CMU, Michigan, UIC, Iowa State\n\nComing up:\n• May 22: Gates interview prep #1 (mock Q&A)\n• May 25: Gates interview prep #2 (story coaching + outfit check)\n• May 27: Gates Scholarship finalist interview (virtual, 90 min)\n• May 30: thank-you letters to recommenders\n• June 2: MIT pre-orientation logistics meeting\n\nNo blockers right now. If you have any questions before the interview, please reach out.\n\nBest,\nYuanda",
    });
  }

  // 2. Weekly update draft for Ana's mom — USC orientation prep
  if (students.ana) {
    const guardian = students.ana.guardians[0];
    await seedWeeklyUpdate({
      counselorId,
      studentId: students.ana.id,
      studentName: "Ana Rodriguez",
      guardianId: guardian?.id ?? null,
      guardianName: guardian?.firstName ?? "Parent",
      guardianEmail: guardian?.email ?? "carmen.rodriguez.test@example.com",
      audience: "PARENT",
      subject: "Ana's transition week — USC housing + Norman Topping app",
      body:
        "Hi Carmen,\n\nAna's officially USC-bound — she sent her SIR on April 30 and the response from Annenberg has been wonderful. We're spending this week on transition logistics.\n\nThis week:\n• USC housing form in progress (deadline May 28). Ana's leaning toward New Residential College.\n• Hispanic Scholarship Fund $4,000 award confirmed and applied to fall tuition\n• NYU waitlist letter going out by June 1 — Ana wants to stay on but is at peace with USC\n\nNext on the calendar:\n• May 24: 1:1 to walk through Norman Topping Scholars Program application (additional ~$5k/yr + first-gen community at USC). Deadline June 15.\n• July: USC orientation dates released — we'll pick a session together.\n\nNo concerns. Ana is calmer than I've seen her all year.\n\nBest,\nYuanda",
    });
  }

  // 3. Recommender request draft for Kofi — needs to send to teacher for MIT supplemental
  {
    // Create AI output + ReviewQueueItem for a pending recommender_request
    const aiOutput = await prisma.aIOutput.create({
      data: {
        counselorId,
        studentId: students.kofi.id,
        feature: "recommender_email",
        sourceBasis: [{ type: "profile", id: students.kofi.id, label: "Kofi Asante" }],
        confidence: "MEDIUM",
        autonomyMode: "DRAFT",
        output: { subject: "Recommendation request for Kofi Asante", body: "Hi Dr. Okafor, …" },
        modelId: "gemini-2.0-flash",
      },
    });
    // We need a Communication for the review handler
    const comm = await prisma.communication.create({
      data: {
        counselorId,
        studentId: students.kofi.id,
        type: "EMAIL",
        direction: "OUTBOUND",
        subject: "Recommendation request — Kofi Asante (MIT supplemental)",
        body: "Dear Dr. Okafor,\n\nI'm reaching out on behalf of Kofi Asante, who applied to MIT this past December. MIT has invited Kofi to submit a supplemental teacher letter focused on his technical work — specifically the solar-powered water-quality sensors he built for three village schools.\n\nGiven your role as his IB Physics HL teacher and your supervision of his Extended Essay, you have rare visibility into both the rigor and the social engagement of that project. The MIT admissions committee would benefit enormously from your perspective.\n\nThe submission link is: [MIT supplemental upload URL]\nDeadline: May 30, 2026.\n\nNo word count, but MIT specifically values concrete examples. Kofi has prepared a one-page brief sheet of his work with you that he can share if helpful.\n\nThank you for considering this — Kofi speaks of your class with deep respect.\n\nWarmly,\nYuanda Gao\nCounselFlow",
        isDraft: true,
        draftAiId: aiOutput.id,
      },
    });
    await prisma.reviewQueueItem.create({
      data: {
        counselorId,
        entityType: "recommender_request",
        entityId: comm.id,
        aiOutputId: aiOutput.id,
        title: "Request email to Dr. Adaeze Okafor (Kofi Asante)",
        summary: "MIT supplemental teacher letter — IB Physics HL. Deadline May 30.",
      },
    });
  }

  // 4. Profile extraction draft for Lily — from a recent portfolio upload
  {
    const aiOutput = await prisma.aIOutput.create({
      data: {
        counselorId,
        studentId: students.lily.id,
        feature: "profile_extraction",
        sourceBasis: [{ type: "document", id: "doc_lily_portfolio_draft", label: "lily-portfolio-draft.pdf" }],
        confidence: "HIGH",
        autonomyMode: "DRAFT",
        output: {
          honors: ["SAIC Early College Summer Architecture Intensive — accepted (2026)"],
          activities: [
            { name: "Independent ceramics studio", category: "Arts", description: "Weekly studio at Lill Street Art Center; building portfolio body of work focused on container forms.", hoursPerWeek: 4 },
          ],
          notes: "Document references a self-directed portfolio book of 22 works including 6 architectural drawings, 8 ceramic pieces, and 8 urban-design watercolors. Worth confirming during next meeting.",
        },
        modelId: "gemini-2.0-flash",
      },
    });
    await prisma.reviewQueueItem.create({
      data: {
        counselorId,
        entityType: "profile_extraction",
        entityId: aiOutput.id,
        aiOutputId: aiOutput.id,
        title: "Profile updates from lily-portfolio-draft.pdf",
        summary: "1 new honor + 1 new activity extracted from her portfolio review document.",
      },
    });
  }

  // 5. Weekly update draft for Marcus's mom (we don't have Marcus loaded above; query directly)
  const marcus = await prisma.student.findFirst({
    where: { counselorId, email: "marcus.johnson.test@example.com" },
    select: { id: true, guardians: { select: { id: true, firstName: true, email: true } } },
  });
  if (marcus) {
    const guardian = marcus.guardians[0];
    await seedWeeklyUpdate({
      counselorId,
      studentId: marcus.id,
      studentName: "Marcus Johnson",
      guardianId: guardian?.id ?? null,
      guardianName: guardian?.firstName ?? "Parent",
      guardianEmail: guardian?.email ?? "denise.johnson.test@example.com",
      audience: "PARENT",
      subject: "Marcus this week — Duke summer skills program + summer training",
      body:
        "Hi Denise,\n\nWith Duke commitment finalized, the focus is shifting to summer prep. Marcus has been balancing AAU tournament schedule with academic logistics — handling it well.\n\nThis week:\n• Duke Bridge to Excellence program registration completed (3-week pre-orientation in late July)\n• Coach Scheyer's office sent the strength-and-conditioning summer protocol\n• AP exams done as of last Friday — feels good about Stats and Macro\n\nComing up:\n• June 2: 1:1 to finalize summer reading + course planning\n• June 10: Marcus's first AAU tournament of the summer (Atlanta)\n• July 21: Duke pre-orientation begins\n\nNo financial concerns — Duke aid letter is solid. Marcus is one of the calmer transitions I've seen.\n\nBest,\nYuanda",
    });
  }
}

async function seedWeeklyUpdate(args: {
  counselorId: string;
  studentId: string;
  studentName: string;
  guardianId: string | null;
  guardianName: string;
  guardianEmail: string;
  audience: "PARENT" | "STUDENT";
  subject: string;
  body: string;
}) {
  const existing = await prisma.reviewQueueItem.findFirst({
    where: {
      counselorId: args.counselorId,
      entityType: "weekly_update",
      title: { contains: args.studentName },
      status: "PENDING",
    },
    select: { id: true },
  });
  if (existing) return; // Already pending

  const aiOutput = await prisma.aIOutput.create({
    data: {
      counselorId: args.counselorId,
      studentId: args.studentId,
      feature: "weekly_update",
      sourceBasis: [
        { type: "profile", id: args.studentId, label: args.studentName },
      ],
      confidence: "HIGH",
      autonomyMode: "DRAFT",
      output: { subject: args.subject, body: args.body, audience: args.audience },
      modelId: "gemini-2.0-flash",
    },
  });
  const comm = await prisma.communication.create({
    data: {
      counselorId: args.counselorId,
      studentId: args.studentId,
      guardianId: args.audience === "PARENT" ? args.guardianId : null,
      type: "EMAIL",
      direction: "OUTBOUND",
      subject: args.subject,
      body: args.body,
      isDraft: true,
      draftAiId: aiOutput.id,
    },
  });
  await prisma.reviewQueueItem.create({
    data: {
      counselorId: args.counselorId,
      entityType: "weekly_update",
      entityId: comm.id,
      aiOutputId: aiOutput.id,
      title: `Weekly update for ${args.studentName} — ${args.audience === "PARENT" ? `to ${args.guardianName}` : "to student"}`,
      summary: args.subject,
    },
  });
}

// =============================================
// MEETING REQUESTS — scheduling inbox feed
// =============================================
async function seedMeetingRequests(
  counselorId: string,
  students: {
    sam: { id: string; firstName: string; email: string | null } | null;
    aisha: { id: string; firstName: string };
    tyler: { id: string; firstName: string };
  }
) {
  // 1. Sam — AWAITING_STUDENT (waiting for student to pick a slot)
  if (students.sam) {
    const existing = await prisma.meetingRequest.findFirst({
      where: { counselorId, studentId: students.sam.id, status: "AWAITING_STUDENT" },
    });
    if (!existing) {
      await prisma.meetingRequest.create({
        data: {
          counselorId,
          studentId: students.sam.id,
          token: randomBytes(16).toString("hex"),
          expiresAt: addDays(NOW, 14),
          meetingType: "End-of-Year Check-In",
          durationMins: 30,
          message: "Hey Sam — let's wrap up the year and talk summer reading + engineering programs. Pick whichever time works.",
          location: "Zoom",
          status: "AWAITING_STUDENT",
          sentAt: addDays(NOW, -2),
          slots: {
            create: [
              { startAt: addHours(addDays(NOW, 4), 16), sortOrder: 0 },
              { startAt: addHours(addDays(NOW, 5), 15), sortOrder: 1 },
              { startAt: addHours(addDays(NOW, 7), 17), sortOrder: 2 },
            ],
          },
        },
      });
    }
  }

  // 2. Aisha — COUNTER_PROPOSED (she suggested an alternate time)
  {
    const existing = await prisma.meetingRequest.findFirst({
      where: { counselorId, studentId: students.aisha.id, status: "COUNTER_PROPOSED" },
    });
    if (!existing) {
      await prisma.meetingRequest.create({
        data: {
          counselorId,
          studentId: students.aisha.id,
          token: randomBytes(16).toString("hex"),
          expiresAt: addDays(NOW, 10),
          meetingType: "Posse Decision Strategy",
          durationMins: 45,
          message: "Aisha — let's debrief Pomona Posse outcome together and triage what's next.",
          location: "Zoom",
          status: "COUNTER_PROPOSED",
          sentAt: addDays(NOW, -3),
          respondedAt: addDays(NOW, -1),
          counterProposalAt: addHours(addDays(NOW, 2), 18),
          counterProposalNote:
            "I have a Model UN debrief at 5pm that day and a chem final the morning after. Could we do 6pm Thursday instead? I'll have more bandwidth.",
          slots: {
            create: [
              { startAt: addHours(addDays(NOW, 2), 16), sortOrder: 0, status: "REJECTED" },
              { startAt: addHours(addDays(NOW, 3), 15), sortOrder: 1, status: "REJECTED" },
            ],
          },
        },
      });
    }
  }

  // 3. Tyler — original sent + reminder sent + still awaiting
  {
    const existing = await prisma.meetingRequest.findFirst({
      where: { counselorId, studentId: students.tyler.id },
    });
    if (!existing) {
      await prisma.meetingRequest.create({
        data: {
          counselorId,
          studentId: students.tyler.id,
          token: randomBytes(16).toString("hex"),
          expiresAt: addDays(NOW, 7),
          meetingType: "UC Application Strategy Session",
          durationMins: 60,
          message: "Tyler — UC application is opening for fall. Let's lock in your transfer essay angles and the Berkeley vs UCLA target decision.",
          location: "Zoom",
          status: "AWAITING_STUDENT",
          sentAt: addDays(NOW, -6),
          remindedAt: addDays(NOW, -1),
          slots: {
            create: [
              { startAt: addHours(addDays(NOW, 2), 17), sortOrder: 0 },
              { startAt: addHours(addDays(NOW, 3), 18), sortOrder: 1 },
              { startAt: addHours(addDays(NOW, 4), 17), sortOrder: 2 },
            ],
          },
        },
      });
    }
  }
}

// =============================================
// RISK FLAGS
// =============================================
async function seedRiskFlags(
  _counselorId: string,
  students: {
    maya: { id: string } | null;
    aisha: { id: string };
    kofi: { id: string };
    tyler: { id: string };
  }
) {
  const flags: Array<{
    studentId: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    category: string;
    title: string;
    description: string;
  }> = [
    ...(students.maya ? [{
      studentId: students.maya.id,
      severity: "INFO" as const,
      category: "Scholarship dependency",
      title: "Gates Scholarship outcome affects financial calculus",
      description: "MIT aid letter is solid as-is (~$5k/yr family contribution). Gates finalist outcome on May 27 could turn that into a $0 contribution. Worth a brief contingency conversation if Gates doesn't come through.",
    }] : []),
    {
      studentId: students.aisha.id,
      severity: "WARNING",
      category: "Backup plan",
      title: "Posse pending — RD safety net is thin",
      description: "Aisha's RD list (Georgetown SFS, Tufts, Bowdoin, Williams, UChicago) is all reach. If Pomona Posse doesn't come through, the only solid acceptance is currently UIC. Recommend exploring rolling-admission options as insurance through May.",
    },
    {
      studentId: students.kofi.id,
      severity: "WARNING",
      category: "International aid",
      title: "No domestic US safety + aid-critical",
      description: "Kofi is a Ghanaian national applying need-aware to most US schools. He has no domestic safety. MIT decision arrives mid-May; if it doesn't go his way, Cambridge becomes the primary path and we need to fast-track the UCAS-side preparation he's been deprioritizing.",
    },
    {
      studentId: students.tyler.id,
      severity: "INFO",
      category: "Outreach pattern",
      title: "Slow to respond to meeting requests",
      description: "Tyler took 6+ days to respond to last two scheduling requests and needed reminders both times. Likely a function of trail-crew field work schedule. Recommend asking him to send his weekly availability proactively instead of waiting for our outreach.",
    },
  ];

  for (const f of flags) {
    const existing = await prisma.riskFlag.findFirst({
      where: { studentId: f.studentId, title: f.title },
      select: { id: true },
    });
    if (!existing) {
      await prisma.riskFlag.create({ data: f });
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
