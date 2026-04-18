"use client";

import { BookOpen, Target, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfileCardProps {
  student: {
    intendedMajors: string[];
    interests: string[];
    personalNotes: string | null;
    gradeLevel: string;
    gpaUnweighted: number | null;
    gpaWeighted: number | null;
    classRank: string | null;
    courseRigor: string | null;
  };
}

const gradeLevelLabels: Record<string, string> = {
  FRESHMAN: "Freshman",
  SOPHOMORE: "Sophomore",
  JUNIOR: "Junior",
  SENIOR: "Senior",
  GAP_YEAR: "Gap Year",
  TRANSFER: "Transfer",
};

export function ProfileCard({ student }: ProfileCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card p-5 glow-card">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Profile Overview
      </h3>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Academics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4 text-[oklch(0.65_0.2_265)]" />
            Academics
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Grade" value={gradeLevelLabels[student.gradeLevel] || student.gradeLevel} />
            {student.gpaUnweighted && (
              <Row label="GPA (UW)" value={student.gpaUnweighted.toFixed(2)} />
            )}
            {student.gpaWeighted && (
              <Row label="GPA (W)" value={student.gpaWeighted.toFixed(2)} />
            )}
            {student.classRank && <Row label="Rank" value={student.classRank} />}
            {student.courseRigor && <Row label="Rigor" value={student.courseRigor} />}
          </div>
        </div>

        {/* Interests & Majors */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4 text-[oklch(0.7_0.18_155)]" />
            Interests & Direction
          </div>
          {student.intendedMajors.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Intended Majors</p>
              <div className="flex flex-wrap gap-1.5">
                {student.intendedMajors.map((major) => (
                  <Badge
                    key={major}
                    variant="secondary"
                    className="bg-[oklch(0.65_0.2_265_/_10%)] text-[oklch(0.75_0.15_265)] border-[oklch(0.65_0.2_265_/_20%)]"
                  >
                    {major}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {student.interests.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Interests</p>
              <div className="flex flex-wrap gap-1.5">
                {student.interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="bg-white/5 text-muted-foreground border-white/10"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Personal notes */}
      {student.personalNotes && (
        <div className="mt-5 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Heart className="h-4 w-4 text-[oklch(0.7_0.2_330)]" />
            Counselor Notes
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {student.personalNotes}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!student.gpaUnweighted &&
        student.intendedMajors.length === 0 &&
        student.interests.length === 0 &&
        !student.personalNotes && (
          <p className="text-sm text-muted-foreground/50 text-center py-4">
            No profile details yet. Edit the student to add academic info, majors, and interests.
          </p>
        )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
