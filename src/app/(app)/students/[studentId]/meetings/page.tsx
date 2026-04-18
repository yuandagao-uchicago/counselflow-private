"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Plus, Calendar, ArrowLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function MeetingsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: meetings, isLoading } = trpc.meeting.list.useQuery({ studentId });
  const utils = trpc.useUtils();

  const deleteMeeting = trpc.meeting.delete.useMutation({
    onSuccess: () => {
      utils.meeting.list.invalidate({ studentId });
      toast.success("Meeting deleted");
    },
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            render={<Link href={`/students/${studentId}`} />}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={
            <Button className="bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] text-white border-0" />
          }>
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </DialogTrigger>
          <NewMeetingDialog studentId={studentId} onClose={() => setDialogOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : !meetings?.length ? (
        <div className="rounded-2xl border border-white/[0.06] bg-card p-16 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold">No meetings yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Schedule a meeting to start using AI-powered prep briefs and summaries.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => {
            const date = new Date(meeting.scheduledAt);
            return (
              <Link
                key={meeting.id}
                href={`/students/${studentId}/meetings/${meeting.id}`}
                className="flex items-center gap-5 rounded-2xl border border-white/[0.06] bg-card p-4 hover:border-white/[0.12] hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex flex-col items-center rounded-xl bg-white/5 px-4 py-2.5 min-w-[64px]">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {format(date, "MMM")}
                  </span>
                  <span className="text-xl font-bold leading-none">{format(date, "d")}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{meeting.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(date, "h:mm a")}
                    {meeting.location ? ` · ${meeting.location}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {meeting.prepBrief && (
                    <Badge className="bg-[oklch(0.65_0.2_265_/_15%)] text-[oklch(0.75_0.15_265)] border-0">
                      Prep Ready
                    </Badge>
                  )}
                  {meeting.summary && (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-0">
                      Summarized
                    </Badge>
                  )}
                  {!meeting.prepBrief && !meeting.summary && (
                    <Badge variant="secondary" className="bg-white/5 text-muted-foreground border-white/10">
                      Upcoming
                    </Badge>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Delete this meeting?")) {
                      deleteMeeting.mutate({ id: meeting.id });
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewMeetingDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    type: "Check-in",
    scheduledAt: "",
    location: "",
  });

  const createMeeting = trpc.meeting.create.useMutation({
    onSuccess: () => {
      utils.meeting.list.invalidate();
      onClose();
    },
  });

  return (
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
              placeholder="e.g., Check-in, School List Review, Essay Review"
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
            {createMeeting.isPending ? "Creating..." : "Schedule Meeting"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
