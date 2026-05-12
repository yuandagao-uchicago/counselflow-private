"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Sparkles, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Audience = "PARENT" | "STUDENT" | "BOTH";

const AUDIENCE_HINT: Record<Audience, string> = {
  PARENT: "Drafts one update for a guardian on file.",
  STUDENT: "Drafts a direct update to the student.",
  BOTH: "Drafts two separate emails — one for the parent, one for the student. You'll edit each before sending.",
};

export function WeeklyUpdateCard({ studentId }: { studentId: string }) {
  const [audience, setAudience] = useState<Audience>("PARENT");
  const [personalNote, setPersonalNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const generate = trpc.weeklyUpdate.generateDraft.useMutation({
    onSuccess: (res) => {
      const n = res.drafts.length;
      toast.success(
        n === 1
          ? "Draft ready in your approval queue"
          : `${n} drafts ready in your approval queue`,
        {
          action: {
            label: "Review",
            onClick: () => {
              window.location.href = "/approvals";
            },
          },
        },
      );
      setPersonalNote("");
      setShowNote(false);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.34_0.13_25_/_15%)]">
            <Mail className="h-4 w-4 text-[oklch(0.66_0.15_75)]" />
          </div>
          <div>
            <h3 className="font-medium leading-tight">Weekly update</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pulls what got done this week and what&apos;s coming up.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Audience</Label>
        <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
          <SelectTrigger className="bg-foreground/5 border-foreground/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PARENT">Parent</SelectItem>
            <SelectItem value="STUDENT">Student</SelectItem>
            <SelectItem value="BOTH">Both (separate drafts)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground/70">{AUDIENCE_HINT[audience]}</p>
      </div>

      {showNote ? (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Personal note (optional)
          </Label>
          <Textarea
            value={personalNote}
            onChange={(e) => setPersonalNote(e.target.value)}
            placeholder="Anything you want woven into the update — context only you know, an ask, a kudos."
            className="bg-foreground/5 border-foreground/10 min-h-[80px] text-sm"
            maxLength={2000}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          + Add a personal note
        </button>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <Link
          href="/approvals"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Pending drafts →
        </Link>
        <Button
          size="sm"
          onClick={() =>
            generate.mutate({
              studentId,
              audience,
              ...(personalNote.trim() && { personalNote: personalNote.trim() }),
            })
          }
          disabled={generate.isPending}
          className="bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] text-white border-0"
        >
          {generate.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Drafting…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Draft update
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
