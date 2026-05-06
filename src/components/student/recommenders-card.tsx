"use client";

import { useState } from "react";
import {
  UserPlus,
  MoreHorizontal,
  FileText,
  Mail,
  Send,
  Bell,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  NOT_REQUESTED: { label: "Not Requested", color: "bg-foreground/5 text-muted-foreground", icon: Clock },
  REQUESTED: { label: "Requested", color: "bg-blue-500/10 text-blue-500", icon: Mail },
  REMINDED: { label: "Reminded", color: "bg-amber-500/10 text-amber-500", icon: Bell },
  RECEIVED: { label: "Received", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
  SUBMITTED: { label: "Submitted", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
};

const TYPE_LABELS: Record<string, string> = {
  TEACHER: "Teacher",
  COUNSELOR: "Counselor",
  EMPLOYER: "Employer",
  MENTOR: "Mentor",
  PEER: "Peer",
  OTHER: "Other",
};

export function RecommendersCard({ studentId }: { studentId: string }) {
  const utils = trpc.useUtils();
  const { data: recommenders, isLoading, isError } = trpc.recommender.list.useQuery({ studentId });

  const [addOpen, setAddOpen] = useState(false);
  const [bragSheetData, setBragSheetData] = useState<{ data: unknown; name: string } | null>(null);
  const [emailDraft, setEmailDraft] = useState<{
    recommenderId: string;
    subject: string;
    body: string;
    name: string;
  } | null>(null);

  const deleteMutation = trpc.recommender.delete.useMutation({
    onSuccess: () => {
      utils.recommender.list.invalidate({ studentId });
      toast.success("Recommender removed");
    },
    onError: (err) => toast.error(err.message),
  });

  const generateBragSheet = trpc.recommender.generateBragSheet.useMutation({
    onSuccess: (data, vars) => {
      utils.recommender.list.invalidate({ studentId });
      const rec = recommenders?.find((r) => r.id === vars.recommenderId);
      setBragSheetData({ data: data.bragSheet, name: rec?.name ?? "Recommender" });
      toast.success("Brag sheet generated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const generateEmail = trpc.recommender.generateRequestEmail.useMutation({
    onSuccess: (data, vars) => {
      utils.recommender.list.invalidate({ studentId });
      const rec = recommenders?.find((r) => r.id === vars.recommenderId);
      setEmailDraft({
        recommenderId: vars.recommenderId,
        subject: data.subject,
        body: data.body,
        name: rec?.name ?? "Recommender",
      });
      toast.success("Email draft generated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const sendForReview = trpc.recommender.sendForReview.useMutation({
    onSuccess: () => {
      utils.recommender.list.invalidate({ studentId });
      utils.review.pendingCount.invalidate();
      setEmailDraft(null);
      toast.success("Sent to review queue for approval");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.recommender.updateStatus.useMutation({
    onSuccess: () => {
      utils.recommender.list.invalidate({ studentId });
      toast.success("Status updated");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-sm text-destructive">Failed to load recommenders.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recommenders
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !recommenders?.length ? (
        <div className="text-center py-8">
          <UserPlus className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No recommenders yet</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="mt-1"
          >
            Add a recommender
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {recommenders.map((rec) => {
            const config = STATUS_CONFIG[rec.requestStatus] ?? STATUS_CONFIG.NOT_REQUESTED;
            const StatusIcon = config.icon;
            return (
              <div
                key={rec.id}
                className="flex items-center gap-3 rounded-xl border border-foreground/[0.04] bg-foreground/[0.02] p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{rec.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {TYPE_LABELS[rec.type] ?? rec.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {rec.organization && (
                      <span className="text-xs text-muted-foreground truncate">
                        {rec.organization}
                      </span>
                    )}
                    {rec.application && (
                      <span className="text-xs text-muted-foreground truncate">
                        {rec.application.school?.name}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={`${config.color} shrink-0 text-[10px] gap-1`}>
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-7 w-7 shrink-0 hover:bg-accent hover:text-accent-foreground transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => generateBragSheet.mutate({ recommenderId: rec.id })}
                      disabled={generateBragSheet.isPending}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {rec.bragSheetDraft ? "Regenerate" : "Generate"} Brag Sheet
                    </DropdownMenuItem>
                    {rec.bragSheetDraft && (
                      <DropdownMenuItem
                        onClick={() => {
                          try {
                            setBragSheetData({ data: JSON.parse(rec.bragSheetDraft!), name: rec.name });
                          } catch {
                            toast.error("Failed to parse brag sheet data");
                          }
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" /> View Brag Sheet
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => generateEmail.mutate({ recommenderId: rec.id })}
                      disabled={generateEmail.isPending}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {rec.requestEmailDraft ? "Regenerate" : "Generate"} Request Email
                    </DropdownMenuItem>
                    {rec.requestEmailDraft && rec.email && (
                      <DropdownMenuItem
                        onClick={() =>
                          sendForReview.mutate({ recommenderId: rec.id, type: "request" })
                        }
                      >
                        <Send className="h-4 w-4 mr-2" /> Send for Review
                      </DropdownMenuItem>
                    )}
                    {rec.requestStatus === "REQUESTED" && rec.email && (
                      <DropdownMenuItem
                        onClick={() =>
                          sendForReview.mutate({ recommenderId: rec.id, type: "reminder" })
                        }
                      >
                        <Bell className="h-4 w-4 mr-2" /> Send Reminder for Review
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {rec.requestStatus === "REQUESTED" && (
                      <DropdownMenuItem
                        onClick={() =>
                          updateStatus.mutate({ id: rec.id, status: "RECEIVED" })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Received
                      </DropdownMenuItem>
                    )}
                    {rec.requestStatus === "RECEIVED" && (
                      <DropdownMenuItem
                        onClick={() =>
                          updateStatus.mutate({ id: rec.id, status: "SUBMITTED" })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Submitted
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Remove ${rec.name}?`)) {
                          deleteMutation.mutate({ id: rec.id });
                        }
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
      )}

      {/* Add Recommender Dialog */}
      <AddRecommenderDialog
        studentId={studentId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      {/* Brag Sheet Dialog */}
      <Dialog open={!!bragSheetData} onOpenChange={(o) => !o && setBragSheetData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Brag Sheet — {bragSheetData?.name}</DialogTitle>
          </DialogHeader>
          {bragSheetData && <BragSheetView data={bragSheetData.data} />}
        </DialogContent>
      </Dialog>

      {/* Email Draft Dialog */}
      <Dialog open={!!emailDraft} onOpenChange={(o) => !o && setEmailDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Email — {emailDraft?.name}</DialogTitle>
          </DialogHeader>
          {emailDraft && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="text-sm font-medium mt-1">{emailDraft.subject}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Body</Label>
                <Textarea
                  value={emailDraft.body}
                  onChange={(e) =>
                    setEmailDraft({ ...emailDraft, body: e.target.value })
                  }
                  rows={10}
                  className="mt-1 text-sm"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEmailDraft(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    sendForReview.mutate({
                      recommenderId: emailDraft.recommenderId,
                      type: "request",
                      body: emailDraft.body,
                    })
                  }
                  disabled={sendForReview.isPending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send for Review
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----- Sub-components -----

function AddRecommenderDialog({
  studentId,
  open,
  onOpenChange,
}: {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const { data: apps } = trpc.application.list.useQuery({ studentId });

  const [form, setForm] = useState({
    name: "",
    email: "",
    type: "TEACHER" as string,
    relationship: "",
    organization: "",
    applicationId: "",
    notes: "",
  });

  const create = trpc.recommender.create.useMutation({
    onSuccess: () => {
      utils.recommender.list.invalidate({ studentId });
      onOpenChange(false);
      setForm({ name: "", email: "", type: "TEACHER", relationship: "", organization: "", applicationId: "", notes: "" });
      toast.success("Recommender added");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Recommender</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({
              studentId,
              name: form.name,
              email: form.email || undefined,
              type: form.type as "TEACHER",
              relationship: form.relationship || undefined,
              organization: form.organization || undefined,
              applicationId: form.applicationId || undefined,
              notes: form.notes || undefined,
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Organization</Label>
              <Input
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                placeholder="e.g. Lincoln High School"
              />
            </div>
          </div>

          <div>
            <Label>Relationship</Label>
            <Input
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              placeholder="e.g. AP Chemistry teacher, 11th grade"
            />
          </div>

          {apps && apps.length > 0 && (
            <div>
              <Label>Link to Application (optional)</Label>
              <Select
                value={form.applicationId}
                onValueChange={(v) => setForm({ ...form, applicationId: !v || v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {apps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.school?.name ?? "Unknown"} ({app.applicationType.replace(/_/g, " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any context for the counselor..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Adding..." : "Add Recommender"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BragSheetView({ data }: { data: unknown }) {
  const bs = data as {
    studentOverview?: string;
    academicHighlights?: { highlight: string; context?: string }[];
    activitiesAndLeadership?: { activity: string; role?: string; impact: string }[];
    personalQualities?: string[];
    specificAnecdotes?: string[];
    collegeGoals?: string;
    suggestedThemes?: string[];
    talkingPoints?: string[];
  };

  return (
    <div className="space-y-5 text-sm">
      {bs.studentOverview && (
        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Student Overview
          </h4>
          <p className="text-foreground/80">{bs.studentOverview}</p>
        </section>
      )}

      {bs.academicHighlights && bs.academicHighlights.length > 0 && (
        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Academic Highlights
          </h4>
          <ul className="list-disc list-inside space-y-1 text-foreground/80">
            {bs.academicHighlights.map((h, i) => (
              <li key={i}>
                {h.highlight}
                {h.context && (
                  <span className="text-muted-foreground"> — {h.context}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {bs.activitiesAndLeadership && bs.activitiesAndLeadership.length > 0 && (
        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Activities & Leadership
          </h4>
          <ul className="list-disc list-inside space-y-1 text-foreground/80">
            {bs.activitiesAndLeadership.map((a, i) => (
              <li key={i}>
                <strong>{a.activity}</strong>
                {a.role && ` (${a.role})`}: {a.impact}
              </li>
            ))}
          </ul>
        </section>
      )}

      {bs.personalQualities && bs.personalQualities.length > 0 && (
        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Personal Qualities
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {bs.personalQualities.map((q, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {q}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {bs.specificAnecdotes && bs.specificAnecdotes.length > 0 && (
        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Suggested Anecdotes
          </h4>
          <ul className="list-disc list-inside space-y-1 text-foreground/80">
            {bs.specificAnecdotes.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      {bs.collegeGoals && (
        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
            College Goals
          </h4>
          <p className="text-foreground/80">{bs.collegeGoals}</p>
        </section>
      )}

      {bs.suggestedThemes && bs.suggestedThemes.length > 0 && (
        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Suggested Themes
          </h4>
          <ul className="list-disc list-inside space-y-1 text-foreground/80">
            {bs.suggestedThemes.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}

      {bs.talkingPoints && bs.talkingPoints.length > 0 && (
        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Talking Points for Student
          </h4>
          <ul className="list-disc list-inside space-y-1 text-foreground/80">
            {bs.talkingPoints.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
