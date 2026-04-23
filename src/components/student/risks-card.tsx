"use client";

import { AlertTriangle, Info, Shield } from "lucide-react";

interface RiskFlag {
  id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
}

const severityConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  CRITICAL: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  WARNING: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  INFO: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10" },
};

export function RisksCard({ risks }: { risks: RiskFlag[] }) {
  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Flagged Risks
      </h3>

      {risks.length === 0 ? (
        <div className="py-6 text-center">
          <Shield className="mx-auto h-8 w-8 text-emerald-500/40 mb-2" />
          <p className="text-sm text-muted-foreground">No active risks.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {risks.map((risk) => {
            const config = severityConfig[risk.severity] || severityConfig.INFO;
            const Icon = config.icon;

            return (
              <div
                key={risk.id}
                className={`flex items-start gap-3 rounded-xl p-3 ${config.bg}`}
              >
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.color}`} />
                <div>
                  <p className="text-sm font-medium leading-tight">{risk.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {risk.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
