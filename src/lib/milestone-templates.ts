/**
 * Canonical milestone templates for a US college application cycle.
 *
 * `offsetDaysFromGraduation` is the number of days BEFORE the student's
 * expected June 1 graduation that the milestone should target.
 * Negative means after graduation (rare — only ENROLLMENT items).
 */
export interface MilestoneTemplate {
  key: string;
  title: string;
  description: string;
  category: "Research" | "Testing" | "Application" | "Essay" | "Recommendation" | "Financial Aid";
  offsetDaysFromGraduation: number;
  sortOrder: number;
}

// Typical senior-year cycle: graduation ~June 1, apps due Nov–Feb of senior year.
// For a graduation date G, the fall of senior year starts around G - 300 days.
export const MILESTONE_TEMPLATES: MilestoneTemplate[] = [
  {
    key: "initial_college_research",
    title: "Initial college research",
    description: "Identify a first-pass list of 15–25 colleges based on fit, major, and location.",
    category: "Research",
    offsetDaysFromGraduation: 365, // ~1 year before graduation
    sortOrder: 10,
  },
  {
    key: "finalize_test_plan",
    title: "Finalize testing plan",
    description: "Decide SAT vs ACT, pick test dates, and start prep.",
    category: "Testing",
    offsetDaysFromGraduation: 330,
    sortOrder: 20,
  },
  {
    key: "summer_programs_or_activities",
    title: "Summer plans finalized",
    description: "Meaningful summer activity (program, job, project, research) is locked in.",
    category: "Research",
    offsetDaysFromGraduation: 305,
    sortOrder: 30,
  },
  {
    key: "narrow_college_list",
    title: "Narrow college list to 10–12",
    description: "Balanced list of reach / target / safety schools with a clear rationale.",
    category: "Research",
    offsetDaysFromGraduation: 240,
    sortOrder: 40,
  },
  {
    key: "request_recommendations",
    title: "Request letters of recommendation",
    description: "Ask teachers + counselor with brag sheet and specific context.",
    category: "Recommendation",
    offsetDaysFromGraduation: 220,
    sortOrder: 50,
  },
  {
    key: "common_app_profile",
    title: "Complete Common App profile",
    description: "Bio, education, family, activities, honors all entered and verified.",
    category: "Application",
    offsetDaysFromGraduation: 210,
    sortOrder: 60,
  },
  {
    key: "personal_statement_draft",
    title: "Personal statement — first full draft",
    description: "Complete 650-word Common App personal statement ready for counselor review.",
    category: "Essay",
    offsetDaysFromGraduation: 200,
    sortOrder: 70,
  },
  {
    key: "supplemental_essays",
    title: "Supplemental essays drafted",
    description: "First draft of all school-specific supplements for early schools.",
    category: "Essay",
    offsetDaysFromGraduation: 180,
    sortOrder: 80,
  },
  {
    key: "early_submissions",
    title: "Early applications submitted",
    description: "Early Action / Early Decision applications submitted (typically Nov 1–15).",
    category: "Application",
    offsetDaysFromGraduation: 170,
    sortOrder: 90,
  },
  {
    key: "regular_submissions",
    title: "Regular Decision applications submitted",
    description: "All RD applications submitted (typically Jan 1).",
    category: "Application",
    offsetDaysFromGraduation: 120,
    sortOrder: 100,
  },
  {
    key: "fafsa_css",
    title: "Financial aid (FAFSA + CSS) submitted",
    description: "FAFSA and CSS Profile submitted to all schools on the list.",
    category: "Financial Aid",
    offsetDaysFromGraduation: 150,
    sortOrder: 110,
  },
  {
    key: "final_decision",
    title: "Enrollment decision + deposit",
    description: "Final school chosen, enrollment deposit paid by May 1.",
    category: "Application",
    offsetDaysFromGraduation: 30,
    sortOrder: 120,
  },
];

/**
 * Compute dates for each template based on the student's graduation year.
 * Assumes graduation is June 1 of that year.
 */
export function computeMilestoneDates(
  graduationYear: number
): Array<{ template: MilestoneTemplate; targetDate: Date }> {
  const graduation = new Date(graduationYear, 5, 1); // month is 0-indexed, so 5 = June
  return MILESTONE_TEMPLATES.map((template) => {
    const targetDate = new Date(graduation);
    targetDate.setDate(graduation.getDate() - template.offsetDaysFromGraduation);
    return { template, targetDate };
  });
}
