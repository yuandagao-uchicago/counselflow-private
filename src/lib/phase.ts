// Single source of truth for phase styling. Used by student lists, the
// student header, the dashboard, and anywhere a student avatar/phase pill
// renders. Almanac palette only — no rainbow Tailwind gradients.

export type PhaseKey =
  | "EXPLORATION"
  | "LIST_BUILDING"
  | "TESTING"
  | "APPLICATIONS"
  | "ESSAYS"
  | "SUBMISSIONS"
  | "DECISIONS"
  | "ENROLLMENT";

export type PhaseTone = {
  label: string;
  /** Background-tint OKLCH triplet (no alpha, alpha is applied by callers). */
  ink: string;
  /** Almanac CSS var name backing this phase. */
  varName: "--almanac-oxblood" | "--almanac-oxblood-soft" | "--almanac-brass" | "--almanac-sage" | "--almanac-ink" | "--phase-navy" | "--phase-terracotta";
};

// Each phase maps to a single almanac tone. Picks reflect "where in the
// arc" the phase sits — exploration is open/brass, applications is the
// heaviest oxblood, decisions glow brass, enrollment is the green resolution.
export const PHASE_TONES: Record<PhaseKey, PhaseTone> = {
  EXPLORATION:   { label: "Exploration",   ink: "0.66 0.15 75",   varName: "--almanac-brass" },
  LIST_BUILDING: { label: "List Building", ink: "0.42 0.10 250",  varName: "--phase-navy" },
  TESTING:       { label: "Testing",       ink: "0.55 0.16 50",   varName: "--phase-terracotta" },
  APPLICATIONS:  { label: "Applications",  ink: "0.34 0.13 25",   varName: "--almanac-oxblood" },
  ESSAYS:        { label: "Essays",        ink: "0.50 0.16 25",   varName: "--almanac-oxblood-soft" },
  SUBMISSIONS:   { label: "Submissions",   ink: "0.32 0.10 250",  varName: "--phase-navy" },
  DECISIONS:     { label: "Decisions",     ink: "0.55 0.15 75",   varName: "--almanac-brass" },
  ENROLLMENT:    { label: "Enrollment",    ink: "0.46 0.09 155",  varName: "--almanac-sage" },
};

export const PHASE_ORDER: PhaseKey[] = [
  "EXPLORATION",
  "LIST_BUILDING",
  "TESTING",
  "APPLICATIONS",
  "ESSAYS",
  "SUBMISSIONS",
  "DECISIONS",
  "ENROLLMENT",
];

export function phaseTone(phase: string): PhaseTone {
  return PHASE_TONES[phase as PhaseKey] ?? {
    label: phase,
    ink: "0.40 0.02 30",
    varName: "--almanac-ink",
  };
}

/** Inline style for a solid almanac-tinted swatch (used by avatars + pills). */
export function phaseBg(phase: string): React.CSSProperties {
  const t = phaseTone(phase);
  return { backgroundColor: `oklch(${t.ink})` };
}

/** Inline style for a tinted-rule top accent bar above cards. */
export function phaseAccentBar(phase: string): React.CSSProperties {
  const t = phaseTone(phase);
  return {
    background: `linear-gradient(to right, oklch(${t.ink}) 0%, oklch(${t.ink} / 30%) 60%, transparent)`,
  };
}
