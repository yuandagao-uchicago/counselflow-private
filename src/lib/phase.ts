// Single source of truth for phase styling. Used by student lists, the
// student header, the dashboard, and anywhere a student avatar/phase pill
// renders. Phase colors are CSS custom properties so light + dark themes
// each provide values that read well against their respective backgrounds.

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
  /** CSS variable name backing this phase. Resolved per theme in globals.css. */
  cssVar: `--phase-${string}`;
};

export const PHASE_TONES: Record<PhaseKey, PhaseTone> = {
  EXPLORATION:   { label: "Exploration",   cssVar: "--phase-exploration" },
  LIST_BUILDING: { label: "List Building", cssVar: "--phase-list-building" },
  TESTING:       { label: "Testing",       cssVar: "--phase-testing" },
  APPLICATIONS:  { label: "Applications",  cssVar: "--phase-applications" },
  ESSAYS:        { label: "Essays",        cssVar: "--phase-essays" },
  SUBMISSIONS:   { label: "Submissions",   cssVar: "--phase-submissions" },
  DECISIONS:     { label: "Decisions",     cssVar: "--phase-decisions" },
  ENROLLMENT:    { label: "Enrollment",    cssVar: "--phase-enrollment" },
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

const FALLBACK: PhaseTone = { label: "Unknown", cssVar: "--almanac-ink" as `--phase-${string}` };

export function phaseTone(phase: string): PhaseTone {
  return PHASE_TONES[phase as PhaseKey] ?? { ...FALLBACK, label: phase };
}

/** Inline style for a solid phase-tinted swatch (avatars + pills). */
export function phaseBg(phase: string): React.CSSProperties {
  return { backgroundColor: `var(${phaseTone(phase).cssVar})` };
}

/** Inline style for a tinted-rule top accent bar above cards. */
export function phaseAccentBar(phase: string): React.CSSProperties {
  const v = phaseTone(phase).cssVar;
  return {
    background: `linear-gradient(to right, var(${v}) 0%, color-mix(in oklab, var(${v}) 30%, transparent) 60%, transparent)`,
  };
}

/** Inline style for a glow that picks up the phase color. */
export function phaseGlow(phase: string, alpha = 22): React.CSSProperties {
  const v = phaseTone(phase).cssVar;
  return {
    boxShadow: `0 18px 40px -12px color-mix(in oklab, var(${v}) ${alpha}%, transparent)`,
  };
}
