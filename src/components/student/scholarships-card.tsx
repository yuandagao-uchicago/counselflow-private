"use client";

import { useState } from "react";
import {
  GraduationCap,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  Send,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SearchMatch = RouterOutputs["scholarship"]["search"][number];
type SavedScholarshipRow = RouterOutputs["scholarship"]["listSaved"][number];

type SavedStatus = "INTERESTED" | "APPLYING" | "SUBMITTED";

const STATUS_CONFIG: Record<
  SavedStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  INTERESTED: { label: "Interested", color: "bg-blue-500/10 text-blue-500", icon: Bookmark },
  APPLYING: { label: "Applying", color: "bg-amber-500/10 text-amber-500", icon: Send },
  SUBMITTED: { label: "Submitted", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
};

function formatDeadline(d: Date | string | null): string {
  if (!d) return "Rolling";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatAmount(a: number | null): string {
  if (a === null) return "Amount varies";
  return `$${a.toLocaleString()}`;
}

export function ScholarshipsCard({ studentId }: { studentId: string }) {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"matches" | "saved">("matches");
  const [customOpen, setCustomOpen] = useState(false);

  const matches = trpc.scholarship.search.useQuery(
    { studentId, limit: 20 },
    { enabled: tab === "matches" }
  );
  const saved = trpc.scholarship.listSaved.useQuery(
    { studentId },
    { enabled: tab === "saved" }
  );

  const savedCount = saved.data?.length ?? 0;

  const save = trpc.scholarship.save.useMutation({
    onSuccess: () => {
      utils.scholarship.search.invalidate({ studentId });
      utils.scholarship.listSaved.invalidate({ studentId });
      toast.success("Saved to tracker");
    },
    onError: (err) => toast.error(err.message),
  });

  const unsave = trpc.scholarship.unsave.useMutation({
    onSuccess: () => {
      utils.scholarship.search.invalidate({ studentId });
      utils.scholarship.listSaved.invalidate({ studentId });
      toast.success("Removed from tracker");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.scholarship.updateStatus.useMutation({
    onSuccess: () => {
      utils.scholarship.listSaved.invalidate({ studentId });
      toast.success("Status updated");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Scholarships
          </h3>
          <div className="flex rounded-lg bg-foreground/[0.04] p-0.5 text-xs">
            <button
              onClick={() => setTab("matches")}
              className={`px-2 py-1 rounded-md transition-colors ${
                tab === "matches" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Matches
            </button>
            <button
              onClick={() => setTab("saved")}
              className={`px-2 py-1 rounded-md transition-colors ${
                tab === "saved" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Tracker {savedCount > 0 && <span className="ml-1 opacity-70">({savedCount})</span>}
            </button>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCustomOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Custom
        </Button>
      </div>

      {tab === "matches" ? (
        <MatchesList
          data={matches.data}
          isLoading={matches.isLoading}
          isError={matches.isError}
          onSave={(catalogId) => save.mutate({ studentId, catalogId })}
          onUnsave={(id) => unsave.mutate({ id })}
        />
      ) : (
        <SavedList
          data={saved.data}
          isLoading={saved.isLoading}
          isError={saved.isError}
          onUnsave={(id) => unsave.mutate({ id })}
          onStatus={(id, status) => updateStatus.mutate({ id, status })}
        />
      )}

      <AddCustomDialog
        studentId={studentId}
        open={customOpen}
        onOpenChange={setCustomOpen}
      />
    </div>
  );
}

function MatchesList({
  data,
  isLoading,
  isError,
  onSave,
  onUnsave,
}: {
  data: SearchMatch[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onSave: (catalogId: string) => void;
  onUnsave: (savedId: string) => void;
}) {
  if (isError) {
    return <p className="text-sm text-destructive">Failed to load matches.</p>;
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No matches in the catalog yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((m) => (
        <div
          key={m.scholarship.id}
          className="rounded-xl border border-foreground/[0.04] bg-foreground/[0.02] p-3"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <a
                  href={m.scholarship.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm hover:underline truncate inline-flex items-center gap-1"
                >
                  {m.scholarship.title}
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                </a>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {Math.round(m.score * 100)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-1.5">
                <span>{formatAmount(m.scholarship.amount)}</span>
                <span>Due {formatDeadline(m.scholarship.deadline)}</span>
                <span>Effort {m.scholarship.estimatedEffort}/5</span>
              </div>
              {m.explanation.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {m.explanation.map((e, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-normal text-muted-foreground">
                      {e}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {m.saved ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUnsave(m.saved!.id)}
                className="shrink-0"
                title="Remove from tracker"
              >
                <BookmarkCheck className="h-4 w-4 text-primary" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSave(m.scholarship.id)}
                className="shrink-0"
                title="Save to tracker"
              >
                <Bookmark className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SavedList({
  data,
  isLoading,
  isError,
  onUnsave,
  onStatus,
}: {
  data: SavedScholarshipRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onUnsave: (id: string) => void;
  onStatus: (id: string, status: SavedStatus) => void;
}) {
  if (isError) {
    return <p className="text-sm text-destructive">Failed to load tracker.</p>;
  }
  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Nothing saved yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Save matches from the catalog or add a custom one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((s) => {
        const config = STATUS_CONFIG[s.status as SavedStatus];
        const Icon = config.icon;
        return (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl border border-foreground/[0.04] bg-foreground/[0.02] p-3"
          >
            <div className="flex-1 min-w-0">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sm hover:underline truncate inline-flex items-center gap-1"
              >
                {s.title}
                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
              </a>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                <span>{formatAmount(s.amount)}</span>
                <span>Due {formatDeadline(s.deadline)}</span>
                {s.source === "custom" && (
                  <Badge variant="outline" className="text-[10px]">Custom</Badge>
                )}
              </div>
            </div>
            <Badge className={`${config.color} shrink-0 text-[10px] gap-1`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-7 w-7 shrink-0 hover:bg-accent hover:text-accent-foreground transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(STATUS_CONFIG) as SavedStatus[])
                  .filter((st) => st !== s.status)
                  .map((st) => (
                    <DropdownMenuItem key={st} onClick={() => onStatus(s.id, st)}>
                      Mark as {STATUS_CONFIG[st].label}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Remove ${s.title}?`)) onUnsave(s.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </div>
  );
}

function AddCustomDialog({
  studentId,
  open,
  onOpenChange,
}: {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    title: "",
    url: "",
    amount: "",
    deadline: "",
    estimatedEffort: "3",
    eligibilityTags: "",
    description: "",
  });

  const reset = () =>
    setForm({
      title: "",
      url: "",
      amount: "",
      deadline: "",
      estimatedEffort: "3",
      eligibilityTags: "",
      description: "",
    });

  const addCustom = trpc.scholarship.addCustom.useMutation({
    onSuccess: () => {
      utils.scholarship.listSaved.invalidate({ studentId });
      onOpenChange(false);
      reset();
      toast.success("Custom scholarship saved");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Scholarship</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            addCustom.mutate({
              studentId,
              title: form.title,
              url: form.url,
              amount: form.amount ? Number(form.amount) : null,
              deadline: form.deadline || null,
              estimatedEffort: Number(form.estimatedEffort) as 1 | 2 | 3 | 4 | 5,
              eligibilityTags: form.eligibilityTags
                ? form.eligibilityTags.split(",").map((t) => t.trim()).filter(Boolean)
                : [],
              description: form.description || undefined,
            });
          }}
        >
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>URL *</Label>
            <Input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Effort (1 easy → 5 hard) *</Label>
            <Select
              value={form.estimatedEffort}
              onValueChange={(v) => v && setForm({ ...form, estimatedEffort: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Eligibility tags (comma-separated)</Label>
            <Input
              value={form.eligibilityTags}
              onChange={(e) => setForm({ ...form, eligibilityTags: e.target.value })}
              placeholder="e.g. stem, undergraduate, female"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addCustom.isPending}>
              {addCustom.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
