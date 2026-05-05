"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Calendar, MessageSquare, FileText, Loader2, Map, CalendarPlus } from "lucide-react";
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
import { RequestMeetingDialog } from "@/components/scheduling/request-meeting-dialog";

export function QuickActions({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [requestMeetingOpen, setRequestMeetingOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: student } = trpc.student.getById.useQuery({ id: studentId });

  const quickPrep = trpc.meeting.quickPrepBrief.useMutation({
    onSuccess: (data) => {
      utils.student.getById.invalidate({ id: studentId });
      utils.dashboard.stats.invalidate();
      utils.dashboard.upcomingMeetings.invalidate();
      utils.meeting.list.invalidate({ studentId });
      toast.success("Meeting started — AI prep brief ready.");
      router.push(`/students/${studentId}/meetings/${data.meetingId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start meeting");
    },
  });

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => quickPrep.mutate({ studentId })}
          disabled={quickPrep.isPending}
          title="Creates a new meeting (now) and generates an AI prep brief for it"
          className="bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0 shadow-lg shadow-[oklch(0.65_0.2_265_/_20%)] hover:shadow-[oklch(0.65_0.2_265_/_30%)] hover:brightness-110 transition-all"
        >
          {quickPrep.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting meeting…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Start meeting · AI brief
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors"
          nativeButton={false}
          render={<Link href={`/students/${studentId}/journey`} />}
        >
          <Map className="mr-2 h-4 w-4" />
          Open journey
        </Button>
        <Button
          variant="outline"
          className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors"
          onClick={() => setRequestMeetingOpen(true)}
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Request meeting
        </Button>
        <Button
          variant="outline"
          className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors"
          onClick={() => setMeetingDialogOpen(true)}
          title="Schedule directly without sending the student a request"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Schedule directly
        </Button>
        <Button
          variant="outline"
          className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors"
          onClick={() => toast.info("Draft communications coming soon!")}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Draft Update
        </Button>
        <Button
          variant="outline"
          className="border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition-colors"
          onClick={() => toast.info("Quick notes coming soon!")}
        >
          <FileText className="mr-2 h-4 w-4" />
          Quick Note
        </Button>
      </div>

      <MeetingDialog
        studentId={studentId}
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
      />

      <RequestMeetingDialog
        studentId={studentId}
        open={requestMeetingOpen}
        onOpenChange={setRequestMeetingOpen}
        studentEmail={student?.email}
      />
    </>
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
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    type: "Check-in",
    scheduledAt: "",
    location: "",
  });

  const createMeeting = trpc.meeting.create.useMutation({
    onSuccess: () => {
      utils.student.getById.invalidate({ id: studentId });
      utils.meeting.list.invalidate({ studentId });
      utils.dashboard.stats.invalidate();
      utils.dashboard.upcomingMeetings.invalidate();
      onOpenChange(false);
      toast.success("Meeting scheduled!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to schedule meeting");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-foreground/10 bg-popover">
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
                className="bg-foreground/5 border-foreground/10"
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
                className="bg-foreground/5 border-foreground/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="bg-foreground/5 border-foreground/10"
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
