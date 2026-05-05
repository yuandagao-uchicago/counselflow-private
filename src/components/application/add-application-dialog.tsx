"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Search, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const APP_TYPES = [
  { value: "EARLY_DECISION", label: "Early Decision" },
  { value: "EARLY_DECISION_2", label: "Early Decision II" },
  { value: "EARLY_ACTION", label: "Early Action" },
  { value: "RESTRICTIVE_EARLY_ACTION", label: "Restrictive Early Action" },
  { value: "REGULAR_DECISION", label: "Regular Decision" },
  { value: "ROLLING", label: "Rolling" },
] as const;

const PLATFORMS = [
  { value: "COMMON_APP", label: "Common App" },
  { value: "COALITION", label: "Coalition" },
  { value: "UC_APPLICATION", label: "UC Application" },
  { value: "APPLY_TEXAS", label: "ApplyTexas" },
  { value: "SCHOOL_DIRECT", label: "School direct" },
  { value: "OTHER", label: "Other" },
] as const;

export function AddApplicationDialog({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<{ id: string; name: string } | null>(null);
  const [applicationType, setApplicationType] = useState<string>("REGULAR_DECISION");
  const [platform, setPlatform] = useState<string>("COMMON_APP");
  const [deadline, setDeadline] = useState<string>("");
  const [recCount, setRecCount] = useState<number>(2);
  const [hasSupplement, setHasSupplement] = useState<boolean>(true);

  const { data: schools, isLoading: searching } = trpc.school.search.useQuery(
    { query: schoolQuery, limit: 8 },
    { enabled: open && schoolQuery.length >= 1 },
  );

  const utils = trpc.useUtils();

  const findOrCreate = trpc.school.findOrCreate.useMutation();

  const create = trpc.application.create.useMutation({
    onSuccess: () => {
      utils.application.list.invalidate({ studentId });
      utils.dashboard.readinessRollup.invalidate();
      toast.success("Application added");
      reset();
    },
    onError: (e) => toast.error(e.message || "Failed to add application"),
  });

  function reset() {
    setOpen(false);
    setSchoolQuery("");
    setSelectedSchool(null);
    setApplicationType("REGULAR_DECISION");
    setPlatform("COMMON_APP");
    setDeadline("");
    setRecCount(2);
    setHasSupplement(true);
  }

  async function handleSubmit() {
    let schoolId = selectedSchool?.id;

    // If the counselor didn't pick from the dropdown, treat the typed
    // school as a new entry and find-or-create it.
    if (!schoolId && schoolQuery.trim()) {
      const school = await findOrCreate.mutateAsync({ name: schoolQuery.trim() });
      schoolId = school.id;
    }

    if (!schoolId) {
      toast.error("Pick a school");
      return;
    }

    create.mutate({
      studentId,
      schoolId,
      applicationType: applicationType as (typeof APP_TYPES)[number]["value"],
      platform: platform as (typeof PLATFORMS)[number]["value"],
      deadline: deadline ? new Date(deadline) : null,
      recommendationCount: recCount,
      hasSupplement,
    });
  }

  const submitting = create.isPending || findOrCreate.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add application
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add application</DialogTitle>
          <DialogDescription>
            We&apos;ll seed a default checklist (transcript, scores, essay, recs) you can edit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* School search */}
          <div className="space-y-2">
            <Label htmlFor="school">School</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="school"
                value={selectedSchool ? selectedSchool.name : schoolQuery}
                onChange={(e) => {
                  setSelectedSchool(null);
                  setSchoolQuery(e.target.value);
                }}
                placeholder="Stanford University"
                className="pl-9"
              />
            </div>
            {!selectedSchool && schoolQuery.length >= 1 && (
              <div className="rounded-lg border border-foreground/[0.06] bg-card max-h-48 overflow-auto">
                {searching && (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                  </div>
                )}
                {!searching && schools && schools.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No matches. We&apos;ll create &quot;{schoolQuery}&quot; on save.
                  </div>
                )}
                {schools?.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedSchool({ id: s.id, name: s.name });
                      setSchoolQuery(s.name);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-foreground/5 text-left"
                  >
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>{s.name}</span>
                    {(s.city || s.state) && (
                      <span className="text-xs text-muted-foreground/60 ml-auto">
                        {[s.city, s.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type + platform */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Application type</Label>
              <Select
                value={applicationType}
                onValueChange={(v) => v && setApplicationType(v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {APP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={(v) => v && setPlatform(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline (optional)</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Checklist hints */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="recs">Recommendations needed</Label>
              <Input
                id="recs"
                type="number"
                min={0}
                max={6}
                value={recCount}
                onChange={(e) => setRecCount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2 pt-6 flex items-center gap-2">
              <Checkbox
                id="supplement"
                checked={hasSupplement}
                onCheckedChange={(v) => setHasSupplement(Boolean(v))}
              />
              <Label htmlFor="supplement" className="cursor-pointer">School supplement</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || (!selectedSchool && !schoolQuery.trim())}>
            {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Add application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
