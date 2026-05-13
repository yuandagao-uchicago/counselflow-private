"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, GraduationCap, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition, StaggerList, AnimatedCard, motion } from "@/components/shared/motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { phaseTone, phaseAccentBar, phaseBg, phaseChip } from "@/lib/phase";

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = trpc.student.list.useQuery(
    search ? { search } : undefined
  );

  return (
    <PageTransition>
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-6 border-b border-border pb-4">
        <div>
          <p className="section-eyebrow">The roster</p>
          <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight mt-1.5">
            Students
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Every active case file in your practice.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="bg-[var(--almanac-oxblood)] text-[var(--almanac-paper)] border-0 ring-1 ring-[var(--almanac-brass)]/40 shadow-md shadow-[var(--almanac-oxblood)]/20 hover:brightness-110 transition-all" />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </DialogTrigger>
          <AddStudentDialog onClose={() => setDialogOpen(false)} />
        </Dialog>
      </header>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-foreground/5 border-foreground/10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : !data?.students.length ? (
        <div className="paper-grain rounded-2xl border border-border bg-card p-16 text-center">
          <div className="mx-auto h-14 w-14 rounded-xl bg-[var(--almanac-oxblood)] ring-1 ring-[var(--almanac-brass)]/40 flex items-center justify-center mb-5 shadow-md">
            <GraduationCap className="h-6 w-6 text-[var(--almanac-paper)]" />
          </div>
          <h3 className="font-display text-2xl font-medium">No students yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Click <span className="font-serif-italic text-foreground">Add Student</span> to start building your caseload. Each student gets their own case file with milestones, tasks, and AI-powered tools.
          </p>
        </div>
      ) : (
        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.students.map((student, i) => {
            const tone = phaseTone(student.phase);
            return (
              <AnimatedCard key={student.id}>
              <Link
                href={`/students/${student.id}`}
                className="paper-grain block group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-[var(--almanac-brass)]/40 hover:shadow-[0_18px_40px_-12px_color-mix(in_oklab,var(--almanac-oxblood)_22%,transparent)]"
              >
                {/* Phase accent rule — almanac tone, fades right */}
                <div
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={phaseAccentBar(student.phase)}
                />

                <div className="relative flex items-start gap-4">
                  {/* Index numeral — newspaper-style */}
                  <span className="absolute -top-1 -right-1 num-mono text-[10px] tabular-nums text-muted-foreground/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-base font-display font-semibold text-[var(--almanac-paper)] shadow-md ring-1 ring-[var(--almanac-brass)]/30"
                    style={phaseBg(student.phase)}
                  >
                    {student.firstName[0]}{student.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg font-semibold tracking-tight leading-tight">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      <span className="font-serif-italic">{student.highSchool || "No school"}</span>
                      <span className="num-mono ml-1.5">· {student.graduationYear}</span>
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/60">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider"
                    style={phaseChip(student.phase)}
                  >
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: "currentColor" }}
                    />
                    {tone.label}
                  </span>
                  {student._count.tasks > 0 && (
                    <span className="num-mono text-[11px] tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground/80">{student._count.tasks}</span> tasks
                    </span>
                  )}
                </div>
              </Link>
              </AnimatedCard>
            );
          })}
        </StaggerList>
      )}
    </div>
    </PageTransition>
  );
}

function AddStudentDialog({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    gradeLevel: "SENIOR" as const,
    graduationYear: new Date().getFullYear() + 1,
    highSchool: "",
  });

  const createStudent = trpc.student.create.useMutation({
    onSuccess: () => {
      utils.student.list.invalidate();
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createStudent.mutate({
      ...form,
      email: form.email || undefined,
      highSchool: form.highSchool || undefined,
    });
  }

  return (
    <DialogContent className="border-foreground/10 bg-popover">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the student&apos;s basic information. You can add more details later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="bg-foreground/5 border-foreground/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="bg-foreground/5 border-foreground/10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-foreground/5 border-foreground/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="highSchool">High School</Label>
              <Input
                id="highSchool"
                value={form.highSchool}
                onChange={(e) => setForm({ ...form, highSchool: e.target.value })}
                className="bg-foreground/5 border-foreground/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="graduationYear">Graduation Year</Label>
              <Input
                id="graduationYear"
                type="number"
                value={form.graduationYear}
                onChange={(e) => setForm({ ...form, graduationYear: parseInt(e.target.value) })}
                className="bg-foreground/5 border-foreground/10"
                required
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            disabled={createStudent.isPending}
            className="bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] text-white border-0"
          >
            {createStudent.isPending ? "Creating..." : "Add Student"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
