"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Calendar, MessageSquare, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function QuickActions({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [prepDialogOpen, setPrepDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setPrepDialogOpen(true)}
          className="bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0 shadow-lg shadow-[oklch(0.65_0.2_265_/_20%)] hover:shadow-[oklch(0.65_0.2_265_/_30%)] hover:brightness-110 transition-all"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Prep Brief
        </Button>
        <Button
          variant="outline"
          className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
          onClick={() => setMeetingDialogOpen(true)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Meeting
        </Button>
        <Button
          variant="outline"
          className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
          onClick={() => toast.info("Draft communications coming soon!")}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Draft Update
        </Button>
        <Button
          variant="outline"
          className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
          onClick={() => toast.info("Quick notes coming soon!")}
        >
          <FileText className="mr-2 h-4 w-4" />
          Quick Note
        </Button>
      </div>

      {/* Generate Prep Brief — creates meeting + navigates to it */}
      <PrepBriefDialog
        studentId={studentId}
        open={prepDialogOpen}
        onOpenChange={setPrepDialogOpen}
      />

      {/* Schedule Meeting */}
      <MeetingDialog
        studentId={studentId}
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
      />
    </>
  );
}

function PrepBriefDialog({
  studentId,
  open,
  onOpenChange,
}: {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [meetingType, setMeetingType] = useState("Check-in");
  const utils = trpc.useUtils();

  const createMeeting = trpc.meeting.create.useMutation({
    onSuccess: (meeting) => {
      onOpenChange(false);
      router.push(`/students/${studentId}/meetings/${meeting.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create meeting");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[oklch(0.13_0.005_270)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMeeting.mutate({
              studentId,
              scheduledAt: new Date().toISOString(),
              type: meetingType,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Generate Prep Brief</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create a meeting and take you to the prep brief generator where AI will analyze the student&apos;s full case file.
            </p>
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Input
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="bg-white/5 border-white/10"
                placeholder="e.g., Check-in, School List Review, Essay Review"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={createMeeting.isPending}
              className="bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0"
            >
              {createMeeting.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create & Generate Brief
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MeetingDialog({
  studentId,
  open,
  onOpenChange,
}: {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    type: "Check-in",
    scheduledAt: "",
    location: "",
  });

  const createMeeting = trpc.meeting.create.useMutation({
    onSuccess: () => {
      utils.student.getById.invalidate({ id: studentId });
      onOpenChange(false);
      toast.success("Meeting scheduled!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to schedule meeting");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[oklch(0.13_0.005_270)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMeeting.mutate({
              studentId,
              scheduledAt: new Date(form.scheduledAt).toISOString(),
              type: form.type,
              location: form.location || undefined,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Input
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="e.g., Check-in, School List Review"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                className="bg-white/5 border-white/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="bg-white/5 border-white/10"
                placeholder="e.g., Zoom, Office, Phone"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={createMeeting.isPending}
              className="bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0"
            >
              {createMeeting.isPending ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
