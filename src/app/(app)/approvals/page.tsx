"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Mail, Loader2, CheckCircle2, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ExtractionReviewCard } from "@/components/document/extraction-review-card";

type Status = "PENDING" | "APPROVED" | "REJECTED";

export default function ApprovalsPage() {
  const [status, setStatus] = useState<Status>("PENDING");

  const { data: items, isLoading } = trpc.review.list.useQuery({ status });

  return (
    <div className="space-y-6 page-enter max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground mt-1">
          Review AI-drafted communications before they&apos;re used.
        </p>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
        <TabsList className="bg-foreground/5 border border-foreground/10">
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={status} className="mt-5 space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </>
          ) : !items?.length ? (
            <EmptyState status={status} />
          ) : (
            items.map((item) =>
              item.entityType === "profile_extraction" ? (
                <ExtractionReviewCard key={item.id} item={item} />
              ) : (
                <ReviewCard key={item.id} item={item} />
              )
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ status }: { status: Status }) {
  const copy =
    status === "PENDING"
      ? "Nothing to approve right now. AI-drafted follow-up emails will appear here after each meeting is summarized."
      : status === "APPROVED"
      ? "No approved items yet."
      : "No rejected items.";
  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-16 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500/40 mb-3" />
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{copy}</p>
    </div>
  );
}

type ReviewItem = {
  id: string;
  entityType: string;
  title: string;
  summary: string | null;
  status: string;
  createdAt: string | Date;
  reviewedAt: string | Date | null;
  communication: {
    id: string;
    subject: string | null;
    body: string;
    student: { id: string; firstName: string; lastName: string };
  } | null;
};

function ReviewCard({ item }: { item: ReviewItem }) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(item.communication?.subject ?? "");
  const [body, setBody] = useState(item.communication?.body ?? "");

  const updateDraft = trpc.review.updateCommunicationDraft.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate();
      toast.success("Edits saved");
      setEditing(false);
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  const approve = trpc.review.approve.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate();
      utils.review.pendingCount.invalidate();
      toast.success("Approved");
    },
    onError: (err) => toast.error(err.message || "Failed to approve"),
  });

  const reject = trpc.review.reject.useMutation({
    onSuccess: () => {
      utils.review.list.invalidate();
      utils.review.pendingCount.invalidate();
      toast.success("Rejected");
    },
    onError: (err) => toast.error(err.message || "Failed to reject"),
  });

  const isPending = item.status === "PENDING";

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.34_0.13_25_/_15%)]">
            <Mail className="h-5 w-5 text-[oklch(0.66_0.15_75)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium">{item.title}</p>
              <Badge className="bg-[oklch(0.34_0.13_25_/_10%)] text-[oklch(0.66_0.15_75)] border-0 text-[10px]">
                AI draft · email
              </Badge>
              {item.status === "APPROVED" && (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-[10px]">
                  Approved
                </Badge>
              )}
              {item.status === "REJECTED" && (
                <Badge className="bg-red-500/15 text-red-400 border-0 text-[10px]">
                  Rejected
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              {item.communication?.student && (
                <>
                  {" · "}
                  <Link
                    href={`/students/${item.communication.student.id}`}
                    className="hover:underline"
                  >
                    {item.communication.student.firstName}{" "}
                    {item.communication.student.lastName}
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {item.communication ? (
        <div className="space-y-3">
          {editing ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-foreground/5 border-foreground/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Body</label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="bg-foreground/5 border-foreground/10 min-h-[200px] font-sans text-sm"
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-foreground/[0.03] p-4 space-y-2">
              {item.communication.subject && (
                <p className="text-sm font-medium">
                  <span className="text-muted-foreground">Subject:</span>{" "}
                  {item.communication.subject}
                </p>
              )}
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">
                {item.communication.body}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Draft content is no longer available.
        </p>
      )}

      {/* Actions */}
      {isPending && item.communication && (
        <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-foreground/[0.06]">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-foreground/10 bg-foreground/5"
                onClick={() => {
                  setEditing(false);
                  setSubject(item.communication!.subject ?? "");
                  setBody(item.communication!.body);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] text-white border-0"
                disabled={updateDraft.isPending || !body.trim()}
                onClick={() =>
                  updateDraft.mutate({
                    reviewQueueItemId: item.id,
                    subject,
                    body,
                  })
                }
              >
                {updateDraft.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Save edits"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                onClick={() => reject.mutate({ id: item.id })}
                disabled={reject.isPending || approve.isPending}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Reject
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] text-white border-0"
                onClick={() => approve.mutate({ id: item.id })}
                disabled={approve.isPending || reject.isPending}
              >
                {approve.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                )}
                Approve
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
