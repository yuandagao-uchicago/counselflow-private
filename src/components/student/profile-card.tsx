"use client";

import { useState } from "react";
import { BookOpen, Target, Heart, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditProfileDialog } from "./edit-profile-dialog";

interface ProfileCardProps {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    preferredName: string | null;
    email: string | null;
    phone: string | null;
    highSchool: string | null;
    graduationYear: number;
    phase: string;
    intendedMajors: string[];
    interests: string[];
    personalNotes: string | null;
    gradeLevel: string;
    gpaUnweighted: number | null;
    gpaWeighted: number | null;
    satScore: number | null;
    actScore: number | null;
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
  const [editOpen, setEditOpen] = useState(false);

  const hasAnyData =
    student.gpaUnweighted ||
    student.gpaWeighted ||
    student.satScore ||
    student.actScore ||
    student.classRank ||
    student.courseRigor ||
    student.intendedMajors.length > 0 ||
    student.interests.length > 0 ||
    student.personalNotes;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Profile Overview
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -mr-2"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Academics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BookOpen className="h-4 w-4 text-[oklch(0.65_0.2_265)]" />
            Academics
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Grade" value={gradeLevelLabels[student.gradeLevel] || student.gradeLevel} />
            {student.gpaUnweighted != null && (
              <Row label="GPA (UW)" value={student.gpaUnweighted.toFixed(2)} />
            )}
            {student.gpaWeighted != null && (
              <Row label="GPA (W)" value={student.gpaWeighted.toFixed(2)} />
            )}
            {student.satScore != null && <Row label="SAT" value={student.satScore.toString()} />}
            {student.actScore != null && <Row label="ACT" value={student.actScore.toString()} />}
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
          {student.intendedMajors.length === 0 && student.interests.length === 0 && (
            <p className="text-xs text-muted-foreground/60">
              No majors or interests yet.
            </p>
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
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {student.personalNotes}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyData && (
        <p className="text-sm text-muted-foreground/50 text-center py-4">
          No profile details yet. Click <strong>Edit</strong> to add academics, majors, interests, and notes.
        </p>
      )}

      <EditProfileDialog student={student} open={editOpen} onOpenChange={setEditOpen} />
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
