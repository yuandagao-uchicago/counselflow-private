// Map a CounselFlow Student into the tag-set the ranker expects.
// Grade level maps to year-tags ("undergraduate", "senior", "high-school-senior",
// etc.) so the ranker's eligibility logic can match against the catalog.

import type { GradeLevel } from "@prisma/client";

type StudentLike = {
  gradeLevel: GradeLevel;
  intendedMajors: string[];
  interests: string[];
};

// Counselors using CounselFlow advise high-school students. SENIOR maps to
// the "high-school-senior" tag the catalog uses for senior-year awards; all
// HS grades carry "undergraduate" so soon-to-enroll students still match
// undergrad scholarships. TRANSFER maps to community-college pipelines.
const GRADE_TO_TAGS: Record<GradeLevel, string[]> = {
  FRESHMAN: ["high-school", "freshman", "undergraduate"],
  SOPHOMORE: ["high-school", "sophomore", "undergraduate"],
  JUNIOR: ["high-school", "junior", "high-school-junior", "undergraduate"],
  SENIOR: ["high-school", "senior", "high-school-senior", "undergraduate"],
  GAP_YEAR: ["undergraduate"],
  TRANSFER: ["transfer", "community-college", "undergraduate"],
};

function slug(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, "-");
}

export function profileTagsFromStudent(student: StudentLike): Set<string> {
  const tags = new Set<string>();
  for (const t of GRADE_TO_TAGS[student.gradeLevel] ?? []) tags.add(t);
  for (const m of student.intendedMajors) tags.add(slug(m));
  for (const i of student.interests) tags.add(slug(i));
  // Common umbrella tags inferred from major slugs so the catalog's broad
  // tags (e.g. "stem", "computer-science") light up without forcing the user
  // to type them verbatim in intendedMajors.
  const STEM_HINTS = [
    "computer",
    "computer-science",
    "engineering",
    "math",
    "mathematics",
    "physics",
    "biology",
    "chemistry",
    "statistics",
    "data",
    "data-science",
  ];
  for (const m of student.intendedMajors) {
    const s = slug(m);
    if (STEM_HINTS.some((h) => s.includes(h))) {
      tags.add("stem");
      if (s.includes("engineering")) tags.add("engineering");
      if (s.includes("computer")) tags.add("computer-science");
    }
  }
  return tags;
}
