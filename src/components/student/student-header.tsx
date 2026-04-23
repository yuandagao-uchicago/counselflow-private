"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Phone, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const phaseConfig: Record<string, { label: string; color: string }> = {
  EXPLORATION: { label: "Exploration", color: "from-blue-500 to-cyan-400" },
  LIST_BUILDING: { label: "List Building", color: "from-violet-500 to-purple-400" },
  TESTING: { label: "Testing", color: "from-amber-500 to-orange-400" },
  APPLICATIONS: { label: "Applications", color: "from-emerald-500 to-green-400" },
  ESSAYS: { label: "Essays", color: "from-pink-500 to-rose-400" },
  SUBMISSIONS: { label: "Submissions", color: "from-indigo-500 to-blue-400" },
  DECISIONS: { label: "Decisions", color: "from-yellow-500 to-amber-400" },
  ENROLLMENT: { label: "Enrollment", color: "from-green-500 to-emerald-400" },
};

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
    phase: string;
    status: string;
  };
}

export function StudentHeader({ student }: StudentHeaderProps) {
  const router = useRouter();
  const phase = phaseConfig[student.phase] || { label: student.phase, color: "from-gray-500 to-gray-400" };
  const displayName = student.preferredName || student.firstName;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-foreground/[0.06] bg-gradient-to-br from-card to-card/80 p-6">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.65_0.2_265_/_5%)] to-transparent pointer-events-none" />

      <div className="relative">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/students")}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Students
        </Button>

        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${phase.color} text-2xl font-bold text-white shadow-lg`}>
              {student.firstName[0]}{student.lastName[0]}
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {displayName} {student.lastName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {student.highSchool && (
                  <span className="flex items-center gap-1">
                    <School className="h-3.5 w-3.5" />
                    {student.highSchool}
                  </span>
                )}
                <span>Class of {student.graduationYear}</span>
                {student.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {student.email}
                  </span>
                )}
                {student.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {student.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats pills */}
          <div className="hidden md:flex items-center gap-2">
            {student.gpaUnweighted && (
              <div className="rounded-xl bg-foreground/5 px-3 py-1.5 text-center">
                <p className="text-xs text-muted-foreground">GPA</p>
                <p className="text-sm font-bold">{student.gpaUnweighted.toFixed(2)}</p>
              </div>
            )}
            {student.satScore && (
              <div className="rounded-xl bg-foreground/5 px-3 py-1.5 text-center">
                <p className="text-xs text-muted-foreground">SAT</p>
                <p className="text-sm font-bold">{student.satScore}</p>
              </div>
            )}
            {student.actScore && (
              <div className="rounded-xl bg-foreground/5 px-3 py-1.5 text-center">
                <p className="text-xs text-muted-foreground">ACT</p>
                <p className="text-sm font-bold">{student.actScore}</p>
              </div>
            )}
            <Badge className={`bg-gradient-to-r ${phase.color} text-white border-0 px-3 py-1`}>
              {phase.label}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
