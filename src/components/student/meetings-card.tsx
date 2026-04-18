"use client";

import { Video, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Meeting {
  id: string;
  scheduledAt: string | Date;
  type: string;
  location: string | null;
  prepBrief: string | null;
  summary: string | null;
}

export function MeetingsCard({ meetings, studentId }: { meetings: Meeting[]; studentId: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Meetings
        </h3>
      </div>

      {meetings.length === 0 ? (
        <div className="py-8 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No meetings scheduled yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => {
            const date = new Date(meeting.scheduledAt);
            const hasBrief = !!meeting.prepBrief;
            const hasSummary = !!meeting.summary;

            return (
              <div
                key={meeting.id}
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
                <div className="flex gap-1.5">
                  {hasBrief && (
                    <Badge variant="secondary" className="text-[10px] bg-[oklch(0.65_0.2_265_/_10%)] text-[oklch(0.75_0.15_265)] border-0">
                      Brief
                    </Badge>
                  )}
                  {hasSummary && (
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-0">
                      Summary
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
