"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, GraduationCap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

const phaseLabels: Record<string, string> = {
  EXPLORATION: "Exploration",
  LIST_BUILDING: "List Building",
  TESTING: "Testing",
  APPLICATIONS: "Applications",
  ESSAYS: "Essays",
  SUBMISSIONS: "Submissions",
  DECISIONS: "Decisions",
  ENROLLMENT: "Enrollment",
};

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PROSPECT: "bg-blue-100 text-blue-800",
  DEFERRED: "bg-yellow-100 text-yellow-800",
  GRADUATED: "bg-purple-100 text-purple-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
};

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = trpc.student.list.useQuery(
    search ? { search } : undefined
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            Manage your student caseload
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
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
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !data?.students.length ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No students yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Click &quot;Add Student&quot; to start building your caseload.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.students.map((student) => (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {student.firstName[0]}
                  {student.lastName[0]}
                </div>
                <div>
                  <p className="font-medium">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {student.highSchool || "No school"} &middot; Class of{" "}
                    {student.graduationYear}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  {phaseLabels[student.phase] || student.phase}
                </Badge>
                <Badge
                  className={statusColors[student.status] || ""}
                  variant="secondary"
                >
                  {student.status.toLowerCase()}
                </Badge>
                {student._count.tasks > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {student._count.tasks} open tasks
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
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
    <DialogContent>
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
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
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
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="highSchool">High School</Label>
              <Input
                id="highSchool"
                value={form.highSchool}
                onChange={(e) =>
                  setForm({ ...form, highSchool: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="graduationYear">Graduation Year</Label>
              <Input
                id="graduationYear"
                type="number"
                value={form.graduationYear}
                onChange={(e) =>
                  setForm({
                    ...form,
                    graduationYear: parseInt(e.target.value),
                  })
                }
                required
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            disabled={createStudent.isPending}
          >
            {createStudent.isPending ? "Creating..." : "Add Student"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
