// Explainable ranking for scholarships. Ported from rank.py.
// Score = w.eligibility * elig + w.amount * amt + w.deadline * urg − w.effort * effortPenalty
// Each component returns a normalized [0,1] sub-score and contributes a
// human-readable line to the explanation if it meaningfully moved the score.

import type { CatalogScholarship } from "./catalog";

export type Scholarship = Omit<CatalogScholarship, "source"> & {
  source: string;
};

export type RankWeights = {
  eligibility: number;
  amount: number;
  deadline: number;
  effort: number;
};

export const DEFAULT_WEIGHTS: RankWeights = {
  eligibility: 0.4,
  amount: 0.25,
  deadline: 0.25,
  effort: 0.1,
};

export type RankProfile = {
  // Tags derived from the student record (major slug, year, demographics,
  // interests, etc.) — see profileTagsFromStudent().
  tags: Set<string>;
  weights: RankWeights;
};

export type RankBreakdown = {
  eligibility: number;
  amount: number;
  deadline: number;
  effortPenalty: number;
};

export type RankedScholarship = {
  scholarship: Scholarship;
  score: number;
  breakdown: RankBreakdown;
  explanation: string[];
};

const AMOUNT_CAP = 20000;
const REASON_THRESHOLD = 0.05;

function eligibilityMatch(s: Scholarship, profile: RankProfile) {
  if (s.eligibilityTags.length === 0) {
    return { score: 0.3, matched: 0, total: 0 };
  }
  const matched = s.eligibilityTags.filter((t) => profile.tags.has(t)).length;
  return { score: matched / s.eligibilityTags.length, matched, total: s.eligibilityTags.length };
}

function amountScore(amount: number | null): number {
  if (amount === null) return 0.3;
  if (amount <= 0) return 0;
  return Math.min(amount, AMOUNT_CAP) / AMOUNT_CAP;
}

function urgencyScore(deadline: string | null, today: Date) {
  if (deadline === null) return { score: 0.1, days: null as number | null };
  const due = new Date(deadline + "T00:00:00Z");
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = Math.floor((due.getTime() - todayUtc) / 86400000);
  if (days < 0) return { score: 0, days };
  if (days <= 7) return { score: 1, days };
  if (days <= 30) return { score: 0.8, days };
  if (days <= 90) return { score: 0.5, days };
  return { score: 0.2, days };
}

function effortPenalty(effort: number): number {
  return Math.max(0, Math.min(1, (effort - 1) / 4));
}

function buildExplanation(args: {
  s: Scholarship;
  elig: number;
  matched: number;
  total: number;
  amt: number;
  urg: number;
  days: number | null;
  effPen: number;
  weights: RankWeights;
}): string[] {
  const { s, elig, matched, total, amt, urg, days, effPen, weights } = args;
  const out: string[] = [];

  const eligContribution = weights.eligibility * elig;
  if (eligContribution >= REASON_THRESHOLD && total > 0) {
    if (elig >= 0.75) out.push(`high eligibility match (${matched} of ${total} tags)`);
    else if (elig >= 0.4) out.push(`partial eligibility match (${matched} of ${total} tags)`);
    else out.push(`weak eligibility match (${matched} of ${total} tags)`);
  } else if (total === 0) {
    out.push("eligibility unknown (no tags from source)");
  }

  const amtContribution = weights.amount * amt;
  if (amtContribution >= REASON_THRESHOLD && s.amount !== null) {
    out.push(`award $${s.amount.toLocaleString()}`);
  } else if (s.amount === null) {
    out.push("award amount not disclosed");
  }

  const urgContribution = weights.deadline * urg;
  if (urgContribution >= REASON_THRESHOLD) {
    if (days === null) out.push("rolling deadline");
    else if (days <= 0) out.push("deadline passed");
    else if (days === 1) out.push("deadline in 1 day");
    else out.push(`deadline in ${days} days`);
  }

  if (effPen * weights.effort >= REASON_THRESHOLD) {
    if (s.estimatedEffort <= 2) out.push("low effort application");
    else if (s.estimatedEffort === 3) out.push("moderate effort application");
    else out.push("high effort application (penalty applied)");
  }

  return out;
}

export function rankOne(
  s: Scholarship,
  profile: RankProfile,
  today: Date = new Date()
): RankedScholarship {
  const w = profile.weights;
  const { score: elig, matched, total } = eligibilityMatch(s, profile);
  const amt = amountScore(s.amount);
  const { score: urg, days } = urgencyScore(s.deadline, today);
  const effPen = effortPenalty(s.estimatedEffort);

  const raw = w.eligibility * elig + w.amount * amt + w.deadline * urg - w.effort * effPen;
  const score = Math.max(0, Math.min(1, raw));

  return {
    scholarship: s,
    score: Math.round(score * 1000) / 1000,
    breakdown: {
      eligibility: Math.round(elig * 1000) / 1000,
      amount: Math.round(amt * 1000) / 1000,
      deadline: Math.round(urg * 1000) / 1000,
      effortPenalty: Math.round(effPen * 1000) / 1000,
    },
    explanation: buildExplanation({ s, elig, matched, total, amt, urg, days, effPen, weights: w }),
  };
}

export function rankAll(
  items: Scholarship[],
  profile: RankProfile,
  today: Date = new Date()
): RankedScholarship[] {
  return items.map((s) => rankOne(s, profile, today)).sort((a, b) => b.score - a.score);
}
