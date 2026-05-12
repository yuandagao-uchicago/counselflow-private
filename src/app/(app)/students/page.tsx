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

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = trpc.student.list.useQuery(
    search ? { search } : undefined
  );

  return (
    <PageTransition>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1">
            Manage your student caseload
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] text-white border-0 shadow-lg shadow-[oklch(0.34_0.13_25_/_20%)] hover:brightness-110 transition-all" />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </DialogTrigger>
          <AddStudentDialog onClose={() => setDialogOpen(false)} />
        </Dialog>
      </div>

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
        <div className="rounded-2xl border border-foreground/[0.06] bg-card p-16 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] flex items-center justify-center mb-4 shadow-lg shadow-[oklch(0.34_0.13_25_/_20%)]">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold">No students yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Click &quot;Add Student&quot; to start building your caseload. Each student gets their own case file with milestones, tasks, and AI-powered tools.
          </p>
        </div>
      ) : (
        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.students.map((student) => {
            const phase = phaseConfig[student.phase] || { label: student.phase, color: "from-gray-500 to-gray-400" };
            return (
              <AnimatedCard key={student.id}>
              <Link
                href={`/students/${student.id}`}
                className="block group relative overflow-hidden rounded-2xl border border-foreground/[0.06] bg-card p-5 transition-all hover:border-foreground/[0.12] hover:shadow-lg hover:shadow-black/20"
              >
                {/* Gradient accent line */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${phase.color} opacity-60`} />

                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${phase.color} text-lg font-bold text-white shadow-md`}>
                    {student.firstName[0]}{student.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {student.highSchool || "No school"} &middot; {student.graduationYear}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge className={`bg-gradient-to-r ${phase.color} text-white border-0 text-[10px] px-2`}>
                    {phase.label}
                  </Badge>
                  {student._count.tasks > 0 && (
                    <Badge variant="secondary" className="bg-foreground/5 text-muted-foreground border-foreground/10 text-[10px]">
                      {student._count.tasks} tasks
                    </Badge>
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
