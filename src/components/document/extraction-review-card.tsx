"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  Check,
  X,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DocumentWithStudent = {
  id: string;
  fileName: string;
  documentType: string;
  structuredData: unknown;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    preferredName: string | null;
    email: string | null;
    phone: string | null;
    highSchool: string | null;
    graduationYear: number;
    gpaUnweighted: number | null;
    gpaWeighted: number | null;
    satScore: number | null;
    actScore: number | null;
    classRank: string | null;
    courseRigor: string | null;
    intendedMajors: string[];
    interests: string[];
    personalNotes: string | null;
  };
};

type ReviewItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string | Date;
  document: DocumentWithStudent | null;
};

/**
 * Fields the counselor can accept individually. The `get` function pulls
 * the suggested value from the extraction JSON; `currentValue` pulls from
 * the student record. `format` optionally formats both sides for display
 * (e.g. arrays → comma-joined).
 */
const FIELD_DEFS: Array<{
  key: string;
  label: string;
  get: (s: Extraction) => unknown;
  currentValue: (s: DocumentWithStudent["student"]) => unknown;
  format?: (v: unknown) => string;
}> = [
  { key: "firstName", label: "First name", get: (s) => s.firstName, currentValue: (s) => s.firstName },
  { key: "lastName", label: "Last name", get: (s) => s.lastName, currentValue: (s) => s.lastName },
  {
    key: "preferredName",
    label: "Preferred name",
    get: (s) => s.preferredName,
    currentValue: (s) => s.preferredName,
  },
  { key: "email", label: "Email", get: (s) => s.email, currentValue: (s) => s.email },
  { key: "phone", label: "Phone", get: (s) => s.phone, currentValue: (s) => s.phone },
  {
    key: "highSchool",
    label: "High school",
    get: (s) => s.highSchool,
    currentValue: (s) => s.highSchool,
  },
  {
    key: "graduationYear",
    label: "Graduation year",
    get: (s) => s.graduationYear,
    currentValue: (s) => s.graduationYear,
  },
  {
    key: "gpaUnweighted",
    label: "GPA (unweighted)",
    get: (s) => s.gpaUnweighted,
    currentValue: (s) => s.gpaUnweighted,
    format: (v) => (typeof v === "number" ? v.toFixed(2) : ""),
  },
  {
    key: "gpaWeighted",
    label: "GPA (weighted)",
    get: (s) => s.gpaWeighted,
    currentValue: (s) => s.gpaWeighted,
    format: (v) => (typeof v === "number" ? v.toFixed(2) : ""),
  },
  { key: "satScore", label: "SAT", get: (s) => s.satScore, currentValue: (s) => s.satScore },
  { key: "actScore", label: "ACT", get: (s) => s.actScore, currentValue: (s) => s.actScore },
  { key: "classRank", label: "Class rank", get: (s) => s.classRank, currentValue: (s) => s.classRank },
  {
    key: "courseRigor",
    label: "Course rigor",
    get: (s) => s.courseRigor,
    currentValue: (s) => s.courseRigor,
  },
  {
    key: "intendedMajors",
    label: "Intended majors",
    get: (s) => s.intendedMajors,
    currentValue: (s) => s.intendedMajors,
    format: (v) => (Array.isArray(v) ? v.join(", ") : ""),
  },
  {
    key: "interests",
    label: "Interests",
    get: (s) => s.interests,
    currentValue: (s) => s.interests,
    format: (v) => (Array.isArray(v) ? v.join(", ") : ""),
  },
  {
    key: "personalNotes",
    label: "Counselor notes",
    get: (s) => s.personalNotes,
    currentValue: (s) => s.personalNotes,
  },
];

interface Extraction {
  detectedDocType?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  highSchool?: string;
  graduationYear?: number;
  gpaUnweighted?: number;
  gpaWeighted?: number;
  satScore?: number;
  actScore?: number;
  classRank?: string;
  courseRigor?: string;
  intendedMajors?: string[];
  interests?: string[];
  personalNotes?: string;
  extractionNotes?: string;
}

function displayValue(v: unknown, format?: (v: unknown) => string): string {
  if (v == null || v === "") return "—";
  if (format) {
    const s = format(v);
    return s === "" ? "—" : s;
  }
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}

function isSuggestionPresent(v: unknown): boolean {
  if (v == null || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function ExtractionReviewCard({ item }: { item: ReviewItem }) {
  const utils = trpc.useUtils();
  const doc = item.document;

  // Build the list of fields where Gemini actually suggested something
  const suggestedFields = useMemo(() => {
    if (!doc?.structuredData) return [];
    const extraction = doc.structuredData as Extraction;
    return FIELD_DEFS.filter((f) => isSuggestionPresent(f.get(extraction))).map((f) => {
      const suggested = f.get(extraction);
      const current = f.currentValue(doc.student);
      const unchanged = JSON.stringify(current) === JSON.stringify(suggested);
      return { def: f, suggested, current, unchanged };
    });
  }, [doc]);

  // Track which fields the counselor has accepted (default: all NEW suggestions)
  const [accepted, setAccepted] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const f of FIELD_DEFS) {
      // Can't reference suggestedFields here — compute inline
      const data = doc?.structuredData as Extraction | undefined;
      if (!data) continue;
      const sug = f.get(data);
      if (!isSuggestionPresent(sug)) continue;
      const cur = doc ? f.currentValue(doc.student) : null;
      const unchanged = JSON.stringify(cur) === JSON.stringify(sug);
      // Default: accept fields that would actually change something
      init[f.key] = !unchanged;
    }
    return init;
  });

  const apply = trpc.review.applyProfileExtraction.useMutation({
    onSuccess: (res) => {
      utils.review.list.invalidate();
      utils.review.pendingCount.invalidate();
      utils.document.list.invalidate({ studentId: doc?.student.id });
      utils.student.getById.invalidate({ id: doc?.student.id ?? "" });
      toast.success(`Applied ${res.appliedFields} field${res.appliedFields === 1 ? "" : "s"} to the profile`);
    },
    onError: (err) => toast.error(err.message || "Failed to apply"),
  });

  const reject = trpc.review.reject.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate();
      utils.review.pendingCount.invalidate();
      utils.document.list.invalidate({ studentId: doc?.student.id });
      toast.success("Rejected");
    },
    onError: (err) => toast.error(err.message || "Failed to reject"),
  });

  if (!doc) {
    return (
      <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5">
        <p className="text-sm text-muted-foreground">Document no longer available.</p>
      </div>
    );
  }

  const extraction = doc.structuredData as Extraction;
  const isPending = item.status === "PENDING";

  function toggleAll(value: boolean) {
    const next: Record<string, boolean> = {};
    for (const sf of suggestedFields) next[sf.def.key] = value && !sf.unchanged;
    setAccepted(next);
  }

  function handleApply() {
    if (!doc) return;
    const acceptedFields: Record<string, unknown> = {};
    for (const sf of suggestedFields) {
      if (accepted[sf.def.key]) {
        acceptedFields[sf.def.key] = sf.suggested;
      }
    }
    apply.mutate({
      reviewQueueItemId: item.id,
      acceptedFields: acceptedFields as Parameters<
        typeof apply.mutate
      >[0]["acceptedFields"],
    });
  }

  const acceptedCount = Object.values(accepted).filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium">{item.title}</p>
              <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                AI extraction · {doc.documentType.toLowerCase().replace("_", " ")}
              </Badge>
              {item.status === "APPROVED" && (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">
                  Applied
                </Badge>
              )}
              {item.status === "REJECTED" && (
                <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px]">
                  Rejected
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}{" · "}
              <Link
                href={`/students/${doc.student.id}`}
                className="hover:underline"
              >
                {doc.student.firstName} {doc.student.lastName}
              </Link>
              {" · "}
              <span>{doc.fileName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Extraction notes */}
      {extraction?.extractionNotes && (
        <div className="rounded-xl bg-foreground/[0.03] p-3 mb-4 flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {extraction.extractionNotes}
          </p>
        </div>
      )}

      {/* Field list */}
      {suggestedFields.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No profile fields were extracted from this document.
        </p>
      ) : (
        <>
          {isPending && (
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-xs text-muted-foreground">
                {suggestedFields.length} field{suggestedFields.length === 1 ? "" : "s"} suggested
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => toggleAll(true)}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => toggleAll(false)}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            {suggestedFields.map((sf) => (
              <FieldRow
                key={sf.def.key}
                label={sf.def.label}
                current={displayValue(sf.current, sf.def.format)}
                suggested={displayValue(sf.suggested, sf.def.format)}
                unchanged={sf.unchanged}
                isPending={isPending}
                accepted={!!accepted[sf.def.key]}
                onToggle={() =>
                  setAccepted((prev) => ({
                    ...prev,
                    [sf.def.key]: !prev[sf.def.key],
                  }))
                }
              />
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-foreground/[0.06]">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            onClick={() => reject.mutate({ id: item.id })}
            disabled={reject.isPending || apply.isPending}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Reject all
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] text-white border-0"
            onClick={handleApply}
            disabled={apply.isPending || reject.isPending || acceptedCount === 0}
          >
            {apply.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5 mr-1.5" />
            )}
            Apply {acceptedCount > 0 ? `${acceptedCount} field${acceptedCount === 1 ? "" : "s"}` : ""}
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldRow({
  label,
  current,
  suggested,
  unchanged,
  isPending,
  accepted,
  onToggle,
}: {
  label: string;
  current: string;
  suggested: string;
  unchanged: boolean;
  isPending: boolean;
  accepted: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`grid grid-cols-[140px_1fr_1fr_auto] items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
        unchanged
          ? "bg-foreground/[0.02] opacity-60"
          : "bg-foreground/[0.03] hover:bg-foreground/[0.05]"
      }`}
    >
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <span className="text-xs text-muted-foreground/80 truncate" title={current}>
        {current}
      </span>
      <span
        className={`text-sm font-medium truncate ${
          unchanged ? "text-muted-foreground" : "text-foreground"
        }`}
        title={suggested}
      >
        {suggested}
      </span>
      {isPending && !unchanged ? (
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-5 w-5 items-center justify-center rounded border transition-all ${
            accepted
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-transparent border-foreground/20 hover:border-foreground/40"
          }`}
          aria-label={accepted ? "Reject this field" : "Accept this field"}
        >
          {accepted && <Check className="h-3 w-3" />}
        </button>
      ) : (
        <span className="w-5" />
      )}
    </div>
  );
}
