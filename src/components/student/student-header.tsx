"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, School, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CaseStats } from "./case-stats";
import { EditProfileDialog } from "./edit-profile-dialog";
import { PHASE_ORDER, PHASE_TONES, phaseTone, phaseBg, phaseChip } from "@/lib/phase";

interface StudentHeaderProps {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    preferredName: string | null;
    email: string | null;
    phone: string | null;
    highSchool: string | null;
    graduationYear: number;
    gradeLevel: string;
    gpaUnweighted: number | null;
    gpaWeighted: number | null;
    satScore: number | null;
    actScore: number | null;
    classRank: string | null;
    courseRigor: string | null;
    intendedMajors: string[];
    interests: string[];
    personalNotes: string | null;
    phase: string;
    status: string;
    milestones?: { status: string }[];
    tasks?: { status: string; dueDate: Date | null }[];
    meetings?: { scheduledAt: Date }[];
  };
}

export function StudentHeader({ student }: StudentHeaderProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const displayName = student.preferredName || student.firstName;
  const currentPhaseIndex = PHASE_ORDER.indexOf(student.phase as (typeof PHASE_ORDER)[number]);
  const tone = phaseTone(student.phase);

  // The little case-file id is just first-name initials + last 4 of student.id —
  // it's purely visual (gives the page a "patient chart" / "dossier" feel).
  const caseId = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}-${student.id.slice(-4).toUpperCase()}`;

  return (
    <>
      <div className="paper-grain relative overflow-hidden rounded-3xl border border-border bg-card">
        {/* Phase wash + ledger lines + topographic backdrop */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ background: `radial-gradient(ellipse 80% 60% at 0% 0%, var(${tone.cssVar}), transparent 65%)` }}
        />
        <div className="ledger-lines absolute inset-0 opacity-40 pointer-events-none" />
        <div className="topo-bg absolute inset-0 text-foreground opacity-[0.05] pointer-events-none" />
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[var(--almanac-brass)]/10 blur-3xl pointer-events-none" />

        {/* Top breadcrumb */}
        <div className="relative flex items-center justify-between px-6 pt-5 md:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/students")}
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            All students
          </Button>
          <div className="flex items-center gap-3">
            <span className="case-id">
              Case · <span className="text-[var(--almanac-oxblood)]">{caseId}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </div>
        </div>

        {/* Identity block — asymmetric editorial composition */}
        <div className="relative grid gap-6 px-6 pt-5 pb-7 md:grid-cols-[auto_1fr] md:gap-8 md:px-8 md:pb-8">
          {/* Avatar */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-display font-semibold text-[var(--almanac-paper)] shadow-xl shadow-black/20 ring-1 ring-[var(--almanac-brass)]/40"
              style={phaseBg(student.phase)}
            >
              {student.firstName[0]}
              {student.lastName[0]}
            </div>
            <div
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]"
              style={phaseChip(student.phase)}
            >
              <span
                className="h-1 w-1 rounded-full pulse-glow"
                style={{ backgroundColor: "currentColor" }}
              />
              {tone.label}
            </div>
          </div>

          {/* Name + meta */}
          <div className="min-w-0 space-y-3">
            <div>
              <h1 className="font-display text-5xl md:text-6xl lg:text-[4rem] font-medium tracking-tight leading-[0.98]">
                {displayName}{" "}
                <span className="font-serif-italic text-[var(--almanac-oxblood)]">
                  {student.lastName}
                </span>
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {student.highSchool && (
                  <span className="inline-flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5" />
                    {student.highSchool}
                  </span>
                )}
                <span className="num-display tabular-nums">Class of {student.graduationYear}</span>
                {student.email && (
                  <a
                    href={`mailto:${student.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {student.email}
                  </a>
                )}
                {student.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {student.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Academic facts row — editorial pulls */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 pt-1">
              {student.gpaUnweighted !== null && (
                <FactPull eyebrow="GPA" value={student.gpaUnweighted.toFixed(2)} />
              )}
              {student.gpaWeighted !== null && (
                <FactPull eyebrow="GPA·W" value={student.gpaWeighted.toFixed(2)} />
              )}
              {student.satScore !== null && (
                <FactPull eyebrow="SAT" value={student.satScore.toString()} />
              )}
              {student.actScore !== null && (
                <FactPull eyebrow="ACT" value={student.actScore.toString()} />
              )}
              {student.intendedMajors.length > 0 && (
                <FactPull
                  eyebrow="Intends"
                  value={student.intendedMajors.slice(0, 2).join(" · ")}
                />
              )}
            </div>
          </div>
        </div>

        {/* Hairline divider before journey + stats band */}
        <div className="relative px-6 md:px-8">
          <div className="border-t border-foreground/[0.06]" />
        </div>

        {/* Phase journey — horizontal narrative */}
        <div className="relative px-6 pt-5 pb-3 md:px-8">
          <p className="section-eyebrow mb-3">Journey</p>
          <ol className="grid grid-cols-8 gap-1.5">
            {PHASE_ORDER.map((p, i) => {
              const isCurrent = i === currentPhaseIndex;
              const isComplete = i < currentPhaseIndex;
              const t = PHASE_TONES[p];
              return (
                <li key={p} className="flex flex-col items-start gap-1.5">
                  <div
                    className="h-1.5 w-full rounded-full transition-all"
                    style={
                      isCurrent
                        ? {
                            backgroundColor: `var(${t.cssVar})`,
                            boxShadow: `0 4px 12px -2px color-mix(in oklab, var(${t.cssVar}) 40%, transparent)`,
                          }
                        : isComplete
                          ? { backgroundColor: "color-mix(in oklab, var(--almanac-sage) 70%, transparent)" }
                          : { backgroundColor: "color-mix(in oklab, var(--foreground) 8%, transparent)" }
                    }
                  />
                  <span
                    className={`text-[10px] uppercase tracking-wider transition-colors ${
                      isCurrent
                        ? "text-foreground font-semibold"
                        : isComplete
                          ? "text-foreground/60"
                          : "text-muted-foreground/40"
                    }`}
                  >
                    {t.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Case stats instrument panel */}
        <div className="relative px-6 pt-5 pb-7 md:px-8">
          <CaseStats
            studentId={student.id}
            milestones={student.milestones}
            tasks={student.tasks}
            meetings={student.meetings}
          />
        </div>
      </div>

      <EditProfileDialog
        student={student}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

function FactPull({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        {eyebrow}
      </span>
      <span className="num-display text-base font-medium text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}
