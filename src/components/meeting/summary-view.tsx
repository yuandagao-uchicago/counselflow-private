"use client";

import { CheckCircle2, Users, Lightbulb, Mail, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActionItem {
  title: string;
  owner: string;
  dueDate?: string;
  priority: string;
}

interface Decision {
  decision: string;
  context: string;
}

const ownerConfig: Record<string, { icon: typeof Users; color: string }> = {
  counselor: { icon: Users, color: "text-[oklch(0.65_0.2_265)]" },
  student: { icon: Users, color: "text-emerald-400" },
  parent: { icon: Users, color: "text-amber-400" },
  other: { icon: Users, color: "text-muted-foreground" },
};

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400",
  high: "bg-orange-500/15 text-orange-400",
  medium: "bg-yellow-500/15 text-yellow-400",
  low: "bg-white/5 text-muted-foreground",
};

export function SummaryView({
  summary,
  actionItems,
  decisions,
}: {
  summary: string;
  actionItems: ActionItem[];
  decisions: Decision[];
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Meeting Summary
        </h2>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <h3 className="font-semibold">Summary</h3>
        </div>
        <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {summary}
        </div>
      </div>

      {/* Key Decisions */}
      {decisions.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <h3 className="font-semibold">Key Decisions</h3>
          </div>
          <div className="space-y-3">
            {decisions.map((d, i) => (
              <div key={i} className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-sm font-medium">{d.decision}</p>
                <p className="text-xs text-muted-foreground mt-1">{d.context}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-[oklch(0.65_0.2_265)]" />
              <h3 className="font-semibold">Action Items</h3>
            </div>
            <Badge variant="secondary" className="bg-[oklch(0.65_0.2_265_/_10%)] text-[oklch(0.75_0.15_265)] border-0 text-[10px]">
              AI Extracted
            </Badge>
          </div>
          <div className="space-y-2">
            {actionItems.map((item, i) => {
              const owner = ownerConfig[item.owner] || ownerConfig.other;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3"
                >
                  <Circle className="h-4 w-4 text-white/20 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 capitalize ${
                        item.owner === "counselor" ? "bg-[oklch(0.65_0.2_265_/_10%)] text-[oklch(0.75_0.15_265)]" :
                        item.owner === "student" ? "bg-emerald-500/10 text-emerald-400" :
                        "bg-white/5 text-muted-foreground"
                      }`}>
                        {item.owner}
                      </Badge>
                      {item.dueDate && (
                        <span className="text-[10px] text-muted-foreground">
                          Due {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={`text-[10px] border-0 ${priorityColors[item.priority] || priorityColors.medium}`}>
                    {item.priority}
                  </Badge>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Tasks have been automatically created and assigned. Review them in the Tasks tab.
          </p>
        </div>
      )}
    </div>
  );
}
