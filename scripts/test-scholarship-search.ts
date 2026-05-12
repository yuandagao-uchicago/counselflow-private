// Smoke-test the scholarship matcher for each seeded student.
// Run with: set -a && source .env.local && set +a && npx tsx scripts/test-scholarship-search.ts

import { prisma } from "../src/lib/prisma";
import { SCHOLARSHIP_CATALOG } from "../src/lib/scholarship/catalog";
import { rankAll, DEFAULT_WEIGHTS } from "../src/lib/scholarship/rank";
import { profileTagsFromStudent } from "../src/lib/scholarship/profile";

async function main() {
  const students = await prisma.student.findMany({
    where: { email: { contains: ".test@example.com" } },
    select: { id: true, firstName: true, lastName: true, gradeLevel: true, intendedMajors: true, interests: true },
    orderBy: { firstName: "asc" },
  });
  for (const s of students) {
    const tags = profileTagsFromStudent(s);
    const ranked = rankAll(SCHOLARSHIP_CATALOG, { tags, weights: DEFAULT_WEIGHTS });
    console.log(`\n=== ${s.firstName} ${s.lastName} (${s.gradeLevel}, majors=${s.intendedMajors.join(", ")}) ===`);
    console.log(`derived tags: ${[...tags].sort().join(", ")}`);
    console.log("Top 5 matches:");
    for (const r of ranked.slice(0, 5)) {
      console.log(`  ${(r.score * 100).toFixed(0).padStart(3)} | ${r.scholarship.title}`);
      console.log(`        ${r.explanation.join(" · ")}`);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
