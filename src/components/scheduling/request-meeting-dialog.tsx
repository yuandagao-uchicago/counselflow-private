"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CalendarPlus,
  Loader2,
  Plus,
  X,
  Send,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Slot = { id: string; value: string }; // value is `<input type="datetime-local">` string

const DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
];

const MEETING_TYPES = [
  "Check-in",
  "School List Review",
  "Essay Review",
  "Application Strategy",
  "Test Plan",
  "Family Meeting",
];

let nextSlotId = 0;
const newSlot = (): Slot => ({ id: `s${++nextSlotId}`, value: "" });

export function RequestMeetingDialog({
  studentId,
  open,
  onOpenChange,
  studentEmail,
}: {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentEmail?: string | null;
}) {
  const utils = trpc.useUtils();
  const [meetingType, setMeetingType] = useState("Check-in");
  const [duration, setDuration] = useState(30);
  const [message, setMessage] = useState("");
  const [ccGuardian, setCcGuardian] = useState(false);
  const [slots, setSlots] = useState<Slot[]>(() => [newSlot(), newSlot()]);

  const create = trpc.meetingRequest.create.useMutation({
    onSuccess: (res) => {
      utils.student.getById.invalidate({ id: studentId });
      utils.meetingRequest.list.invalidate();
      utils.meeting.list.invalidate({ studentId });

      if (res.sent) {
        toast.success("Request sent — student will get an email shortly.");
      } else if (res.magicLink) {
        // Dev / no-Resend path: surface the magic link in the toast so the
        // counselor can preview the student-facing page in one click.
        const fullUrl = `${window.location.origin}${res.magicLink}`;
        toast.warning("Email not sent — copy the magic link to test", {
          duration: 30_000,
          description: fullUrl,
          action: {
            label: "Copy",
            onClick: () => {
              navigator.clipboard.writeText(fullUrl);
              toast.success("Link copied");
            },
          },
        });
      } else {
        toast.warning(`Request created, but email didn't send: ${res.sendReason}`);
      }
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  function reset() {
    setMeetingType("Check-in");
    setDuration(30);
    setMessage("");
    setCcGuardian(false);
    setSlots([newSlot(), newSlot()]);
  }

  function handleSubmit() {
    const validSlots = slots
      .map((s) => s.value)
      .filter(Boolean)
      .map((v) => ({ startAt: new Date(v) }))
      .filter((s) => !Number.isNaN(s.startAt.getTime()));

    if (validSlots.length === 0) {
      toast.error("Add at least one time slot");
      return;
    }

    if (validSlots.length > 6) {
      toast.error("Max 6 slots");
      return;
    }

    create.mutate({
      studentId,
      meetingType,
      durationMins: duration,
      message: message || null,
      ccGuardian,
      slots: validSlots,
    });
  }

  const filledCount = slots.filter((s) => s.value).length;
  const noEmail = !studentEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-[oklch(0.66_0.15_75)]" />
            Request meeting
          </DialogTitle>
          <DialogDescription>
            We&rsquo;ll email the student a magic link with these times. They pick one (or
            propose another) — no login needed.
          </DialogDescription>
        </DialogHeader>

        {noEmail && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2 text-sm">
            <span className="text-amber-300 font-medium">Heads up:</span>
            <span className="text-muted-foreground">
              This student has no email on file. Add one in their profile before requesting.
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Meeting type</Label>
              <Select value={meetingType} onValueChange={(v) => v && setMeetingType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => v && setDuration(Number(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Proposed times <span className="text-muted-foreground/60 font-normal">({filledCount} filled)</span></Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSlots((s) => [...s, newSlot()])}
                disabled={slots.length >= 6}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add slot
              </Button>
            </div>
            <div className="space-y-2">
              {slots.map((slot, i) => (
                <div key={slot.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-6 tabular-nums">#{i + 1}</span>
                  <Input
                    type="datetime-local"
                    value={slot.value}
                    onChange={(e) =>
                      setSlots((arr) => arr.map((s) => (s.id === slot.id ? { ...s, value: e.target.value } : s)))
                    }
                    className="flex-1"
                  />
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSlots((arr) => arr.filter((s) => s.id !== slot.id))}
                      className="text-muted-foreground hover:text-red-400 p-1"
                      aria-label="Remove slot"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything you want them to read before picking a time."
              maxLength={2000}
              className="min-h-[72px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="cc-guardian"
              checked={ccGuardian}
              onCheckedChange={(v) => setCcGuardian(Boolean(v))}
            />
            <Label htmlFor="cc-guardian" className="cursor-pointer text-sm">
              CC parent / guardian on the email
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={create.isPending || noEmail}>
            {create.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" />
                Send request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
