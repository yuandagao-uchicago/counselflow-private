"use client";

import { User, AlertTriangle, Clock, Target, MessageSquare, TrendingUp, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StaggerList, StaggerItem } from "@/components/shared/motion";
import type { MeetingPrep } from "@/ai/schemas/meetingPrep";

const significanceColors = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-muted-foreground",
};

const severityConfig = {
  critical: { color: "text-red-400", bg: "bg-red-500/10" },
  warning: { color: "text-amber-400", bg: "bg-amber-500/10" },
  info: { color: "text-blue-400", bg: "bg-blue-500/10" },
};

export function PrepBriefView({ prep }: { prep: MeetingPrep }) {
  return (
    <StaggerList className="space-y-5">
      <StaggerItem className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[oklch(0.65_0.2_265)] pulse-glow" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          AI Prep Brief
        </h2>
      </StaggerItem>

      {/* Student Snapshot */}
      <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-[oklch(0.65_0.2_265)]" />
          <h3 className="font-semibold">Student Snapshot</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Stat label="Name" value={prep.studentSnapshot.name} />
          <Stat label="Grade" value={prep.studentSnapshot.grade} />
          <Stat label="Phase" value={prep.studentSnapshot.phase} />
          {prep.studentSnapshot.gpa && <Stat label="GPA" value={prep.studentSnapshot.gpa} />}
          {prep.studentSnapshot.testScores && <Stat label="Tests" value={prep.studentSnapshot.testScores} />}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Changes Since Last Meeting */}
        <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-[oklch(0.7_0.18_155)]" />
            <h3 className="font-semibold">What Changed</h3>
          </div>
          {prep.changesSinceLastMeeting.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded changes.</p>
          ) : (
            <div className="space-y-2">
              {prep.changesSinceLastMeeting.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                    c.significance === "high" ? "bg-red-400" : c.significance === "medium" ? "bg-amber-400" : "bg-white/20"
                  }`} />
                  <span>{c.change}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unfinished Items */}
        <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-400" />
            <h3 className="font-semibold">Unfinished Items</h3>
          </div>
          {prep.unfinishedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">All caught up!</p>
          ) : (
            <div className="space-y-2">
              {prep.unfinishedItems.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-2 text-sm">
                  <span>{item.item}</span>
                  <Badge variant="secondary" className={`text-[10px] shrink-0 ${
                    item.urgency === "high" ? "bg-red-500/10 text-red-400" : "bg-white/5 text-muted-foreground"
                  }`}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggested Agenda */}
      <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-[oklch(0.65_0.2_265)]" />
          <h3 className="font-semibold">Suggested Agenda</h3>
        </div>
        <div className="space-y-3">
          {prep.suggestedAgenda.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[oklch(0.65_0.2_265_/_15%)] text-[oklch(0.75_0.15_265)] text-xs font-bold shrink-0">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{item.topic}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risks to Discuss */}
      {prep.risksToDiscuss.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="font-semibold">Risks to Discuss</h3>
          </div>
          <div className="space-y-2">
            {prep.risksToDiscuss.map((risk, i) => {
              const config = severityConfig[risk.severity] || severityConfig.info;
              return (
                <div key={i} className={`rounded-xl p-3 ${config.bg}`}>
                  <p className={`text-sm font-medium ${config.color}`}>{risk.risk}</p>
                  <p className="text-xs text-muted-foreground mt-1">{risk.recommendation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Talking Points */}
      {prep.talkingPoints.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-blue-400" />
            <h3 className="font-semibold">Talking Points</h3>
          </div>
          <ul className="space-y-1.5">
            {prep.talkingPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </StaggerList>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}
