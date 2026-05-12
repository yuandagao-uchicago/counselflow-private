"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/shared/tag-input";

const GRADES = ["FRESHMAN", "SOPHOMORE", "JUNIOR", "SENIOR", "GAP_YEAR", "TRANSFER"] as const;
const PHASES = [
  "EXPLORATION",
  "LIST_BUILDING",
  "TESTING",
  "APPLICATIONS",
  "ESSAYS",
  "SUBMISSIONS",
  "DECISIONS",
  "ENROLLMENT",
] as const;

interface EditProfileStudent {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  highSchool: string | null;
  graduationYear: number;
  gradeLevel: string;
  phase: string;
  gpaUnweighted: number | null;
  gpaWeighted: number | null;
  satScore: number | null;
  actScore: number | null;
  classRank: string | null;
  courseRigor: string | null;
  intendedMajors: string[];
  interests: string[];
  personalNotes: string | null;
}

export function EditProfileDialog({
  student,
  open,
  onOpenChange,
}: {
  student: EditProfileStudent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    firstName: student.firstName,
    lastName: student.lastName,
    preferredName: student.preferredName ?? "",
    email: student.email ?? "",
    phone: student.phone ?? "",
    highSchool: student.highSchool ?? "",
    graduationYear: student.graduationYear,
    gradeLevel: student.gradeLevel as (typeof GRADES)[number],
    phase: student.phase as (typeof PHASES)[number],
    gpaUnweighted: student.gpaUnweighted?.toString() ?? "",
    gpaWeighted: student.gpaWeighted?.toString() ?? "",
    satScore: student.satScore?.toString() ?? "",
    actScore: student.actScore?.toString() ?? "",
    classRank: student.classRank ?? "",
    courseRigor: student.courseRigor ?? "",
    intendedMajors: student.intendedMajors,
    interests: student.interests,
    personalNotes: student.personalNotes ?? "",
  });

  const update = trpc.student.update.useMutation({
    onSuccess: () => {
      utils.student.getById.invalidate({ id: student.id });
      utils.student.list.invalidate();
      toast.success("Profile updated");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message || "Failed to update"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const gradYear = Number(form.graduationYear);
    if (!Number.isFinite(gradYear)) {
      toast.error("Graduation year must be a number");
      return;
    }
    update.mutate({
      id: student.id,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || null,
      phone: form.phone || null,
      highSchool: form.highSchool || null,
      graduationYear: gradYear,
      gradeLevel: form.gradeLevel,
      phase: form.phase,
      gpaUnweighted: toNum(form.gpaUnweighted),
      gpaWeighted: toNum(form.gpaWeighted),
      satScore: toInt(form.satScore),
      actScore: toInt(form.actScore),
      classRank: form.classRank || null,
      courseRigor: form.courseRigor || null,
      preferredName: form.preferredName || null,
      intendedMajors: form.intendedMajors,
      interests: form.interests,
      personalNotes: form.personalNotes || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-foreground/10 bg-popover max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit student profile</DialogTitle>
            <DialogDescription>
              These details shape every AI prep brief and summary.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            {/* Identity */}
            <Section title="Identity">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                    required
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Preferred name" hint="Nickname shown in briefs & emails">
                  <Input
                    value={form.preferredName}
                    onChange={(e) => setForm({ ...form, preferredName: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                    placeholder="optional"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                  />
                </Field>
              </div>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-foreground/5 border-foreground/10"
                />
              </Field>
            </Section>

            {/* School */}
            <Section title="School">
              <div className="grid grid-cols-2 gap-3">
                <Field label="High school">
                  <Input
                    value={form.highSchool}
                    onChange={(e) => setForm({ ...form, highSchool: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                  />
                </Field>
                <Field label="Graduation year">
                  <Input
                    type="number"
                    value={form.graduationYear}
                    onChange={(e) => setForm({ ...form, graduationYear: parseInt(e.target.value) })}
                    className="bg-foreground/5 border-foreground/10"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Grade">
                  <Select
                    value={form.gradeLevel}
                    onValueChange={(v) => setForm({ ...form, gradeLevel: v as (typeof GRADES)[number] })}
                  >
                    <SelectTrigger className="bg-foreground/5 border-foreground/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Phase">
                  <Select
                    value={form.phase}
                    onValueChange={(v) => setForm({ ...form, phase: v as (typeof PHASES)[number] })}
                  >
                    <SelectTrigger className="bg-foreground/5 border-foreground/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHASES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* Academics */}
            <Section title="Academics">
              <div className="grid grid-cols-2 gap-3">
                <Field label="GPA (unweighted)">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={form.gpaUnweighted}
                    onChange={(e) => setForm({ ...form, gpaUnweighted: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                    placeholder="3.85"
                  />
                </Field>
                <Field label="GPA (weighted)">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    value={form.gpaWeighted}
                    onChange={(e) => setForm({ ...form, gpaWeighted: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                    placeholder="4.2"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="SAT">
                  <Input
                    type="number"
                    min="400"
                    max="1600"
                    value={form.satScore}
                    onChange={(e) => setForm({ ...form, satScore: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                    placeholder="1480"
                  />
                </Field>
                <Field label="ACT">
                  <Input
                    type="number"
                    min="1"
                    max="36"
                    value={form.actScore}
                    onChange={(e) => setForm({ ...form, actScore: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                    placeholder="33"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Class rank">
                  <Input
                    value={form.classRank}
                    onChange={(e) => setForm({ ...form, classRank: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                    placeholder="e.g., 12/450"
                  />
                </Field>
                <Field label="Course rigor">
                  <Input
                    value={form.courseRigor}
                    onChange={(e) => setForm({ ...form, courseRigor: e.target.value })}
                    className="bg-foreground/5 border-foreground/10"
                    placeholder="e.g., 8 APs, 3 honors"
                  />
                </Field>
              </div>
            </Section>

            {/* Interests */}
            <Section title="Direction">
              <Field label="Intended majors" hint="Type a major and press Enter or comma">
                <TagInput
                  value={form.intendedMajors}
                  onChange={(v) => setForm({ ...form, intendedMajors: v })}
                  placeholder="Computer Science, Economics…"
                />
              </Field>
              <Field label="Interests">
                <TagInput
                  value={form.interests}
                  onChange={(v) => setForm({ ...form, interests: v })}
                  placeholder="Debate team, film photography…"
                  badgeClassName="bg-foreground/5 text-muted-foreground border-foreground/10"
                />
              </Field>
            </Section>

            <Section title="Counselor notes">
              <Textarea
                value={form.personalNotes}
                onChange={(e) => setForm({ ...form, personalNotes: e.target.value })}
                className="bg-foreground/5 border-foreground/10 min-h-[80px]"
                placeholder="Private notes only you can see — family context, strategy, anything to remember."
              />
            </Section>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="border-foreground/10 bg-foreground/5"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={update.isPending}
              className="bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] text-white border-0"
            >
              {update.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toNum(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function toInt(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
