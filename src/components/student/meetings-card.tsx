"use client";

import Link from "next/link";
import { Video, Calendar, Trash2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Meeting {
  id: string;
  scheduledAt: string | Date;
  type: string;
  location: string | null;
  prepBrief: string | null;
  summary: string | null;
}

export function MeetingsCard({ meetings, studentId }: { meetings: Meeting[]; studentId: string }) {
  const utils = trpc.useUtils();

  const deleteMeeting = trpc.meeting.delete.useMutation({
    onSuccess: () => {
      utils.student.getById.invalidate({ id: studentId });
      utils.meeting.list.invalidate({ studentId });
      utils.dashboard.stats.invalidate();
      utils.dashboard.upcomingMeetings.invalidate();
      toast.success("Meeting deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete meeting"),
  });

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Meetings
        </h3>
        <Link
          href={`/students/${studentId}/meetings`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </div>

      {meetings.length === 0 ? (
        <div className="py-8 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No meetings yet.</p>
          <Link
            href={`/students/${studentId}/meetings`}
            className="text-xs text-[oklch(0.75_0.15_265)] hover:underline mt-1 inline-block"
          >
            Schedule a meeting
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((meeting) => {
            const date = new Date(meeting.scheduledAt);

            return (
              <div key={meeting.id} className="group relative">
                <Link
                  href={`/students/${studentId}/meetings/${meeting.id}`}
                  className="flex items-center gap-4 rounded-xl bg-white/[0.03] p-3 hover:bg-white/[0.06] transition-colors"
                >
                  {/* Date block */}
                  <div className="flex flex-col items-center rounded-lg bg-white/5 px-3 py-2 min-w-[56px]">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {format(date, "MMM")}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {format(date, "d")}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{meeting.type}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {format(date, "h:mm a")}
                      </span>
                      {meeting.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Video className="h-3 w-3" />
                          {meeting.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-2">
                    {meeting.prepBrief && (
                      <Badge variant="secondary" className="text-[10px] bg-[oklch(0.65_0.2_265_/_10%)] text-[oklch(0.75_0.15_265)] border-0">
                        Brief
                      </Badge>
                    )}
                    {meeting.summary && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0">
                        Summary
                      </Badge>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-foreground transition-colors" />
                  </div>
                </Link>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm("Delete this meeting?")) {
                      deleteMeeting.mutate({ id: meeting.id });
                    }
                  }}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground/50 hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
