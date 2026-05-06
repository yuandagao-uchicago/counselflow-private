"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Clock,
  MinusCircle,
  Sparkles,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { kindLabel } from "./readiness-meta";

type Item = {
  id: string;
  kind: string;
  label: string;
  required: boolean;
  status: string; // resolved status from server
  derivationKey: string | null;
  notes: string | null;
};

type ResolvedItem = Item & { resolvedStatus: string };

const STATUS_CONFIG: Record<string, { icon: typeof Circle; tone: string; label: string }> = {
  DONE: { icon: CheckCircle2, tone: "text-emerald-400", label: "Done" },
  IN_PROGRESS: { icon: Circle, tone: "text-[oklch(0.75_0.15_265)]", label: "In progress" },
  WAITING_ON_EXTERNAL: { icon: Clock, tone: "text-amber-300", label: "Waiting" },
  PENDING: { icon: Circle, tone: "text-foreground/30", label: "Pending" },
  NOT_APPLICABLE: { icon: MinusCircle, tone: "text-muted-foreground/50", label: "N/A" },
};

const STATUS_OPTIONS = [
  "PENDING",
  "IN_PROGRESS",
  "WAITING_ON_EXTERNAL",
  "DONE",
  "NOT_APPLICABLE",
] as const;

/**
 * The checklist surface. Two kinds of rows live here side by side:
 *
 *   - Derived items (transcript / scores / essay / recs / form) — their
 *     status is auto-computed by the readiness engine. Counselor can still
 *     override with a manual status if their reality disagrees.
 *
 *   - Custom items (counselor-added supplements, portfolio uploads, etc.) —
 *     pure manual checkboxes.
 *
 * The "auto" badge tells the counselor which is which.
 */
export function RequirementChecklist({
  applicationId,
  items,
  resolved,
  disabled = false,
}: {
  applicationId: string;
  items: Item[];
  resolved: { id: string; status: string }[];
  disabled?: boolean;
}) {
  const utils = trpc.useUtils();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const update = trpc.application.updateItem.useMutation({
    onSuccess: () => {
      utils.application.getById.invalidate({ id: applicationId });
      utils.application.list.invalidate();
      utils.dashboard.readinessRollup.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to update"),
  });

  const remove = trpc.application.removeItem.useMutation({
    onSuccess: () => {
      utils.application.getById.invalidate({ id: applicationId });
      utils.application.list.invalidate();
      utils.dashboard.readinessRollup.invalidate();
      toast.success("Removed");
    },
    onError: (e) => toast.error(e.message || "Failed to remove"),
  });

  const add = trpc.application.addItem.useMutation({
    onSuccess: () => {
      utils.application.getById.invalidate({ id: applicationId });
      utils.application.list.invalidate();
      utils.dashboard.readinessRollup.invalidate();
      setNewLabel("");
      setAdding(false);
    },
    onError: (e) => toast.error(e.message || "Failed to add"),
  });

  const resolvedById = new Map(resolved.map((r) => [r.id, r.status]));

  const merged: ResolvedItem[] = items.map((it) => ({
    ...it,
    resolvedStatus: resolvedById.get(it.id) ?? it.status,
  }));

  return (
    <div className="rounded-2xl border border-foreground/[0.06] bg-card p-5 glow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Checklist {disabled && <span className="ml-2 text-[10px] normal-case font-normal text-muted-foreground/70">(read-only — application submitted)</span>}
        </h3>
        {!disabled && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAdding(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add item
          </Button>
        )}
      </div>

      {adding && (
        <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-foreground/[0.03] border border-foreground/[0.06]">
          <Input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Yale-specific supplement #2"
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newLabel.trim()) {
                add.mutate({ applicationId, label: newLabel.trim() });
              } else if (e.key === "Escape") {
                setAdding(false);
                setNewLabel("");
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => add.mutate({ applicationId, label: newLabel.trim() })}
            disabled={!newLabel.trim() || add.isPending}
          >
            {add.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setAdding(false);
              setNewLabel("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="divide-y divide-foreground/[0.04]">
        {merged.map((item) => {
          const cfg = STATUS_CONFIG[item.resolvedStatus] || STATUS_CONFIG.PENDING;
          const Icon = cfg.icon;
          const isAuto = !!item.derivationKey || item.kind !== "CUSTOM";

          return (
            <div key={item.id} className="flex items-start gap-3 py-2.5 group">
              {/* Toggle quick-complete via checkbox; full status via dropdown */}
              <Checkbox
                checked={item.resolvedStatus === "DONE"}
                onCheckedChange={(v) => {
                  update.mutate({
                    id: item.id,
                    status: v ? "DONE" : "PENDING",
                  });
                }}
                className="mt-0.5"
                disabled={disabled || update.isPending}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-sm leading-tight ${
                      item.resolvedStatus === "DONE"
                        ? "text-muted-foreground line-through"
                        : item.resolvedStatus === "NOT_APPLICABLE"
                          ? "text-muted-foreground/50"
                          : "font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.kind !== "CUSTOM" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground/70 border border-foreground/10">
                      {kindLabel(item.kind)}
                    </span>
                  )}
                  {!item.required && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground/70">
                      Optional
                    </span>
                  )}
                  {isAuto && (
                    <span
                      title="Status auto-syncs from student data"
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[oklch(0.65_0.2_265_/_10%)] text-[oklch(0.75_0.15_265)] border border-[oklch(0.65_0.2_265_/_20%)]"
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      Auto
                    </span>
                  )}
                </div>
              </div>

              {/* Status dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      title="Change status"
                      className="inline-flex items-center gap-1.5 rounded px-2 py-1 hover:bg-foreground/5 text-xs"
                      disabled={disabled || update.isPending}
                    />
                  }
                >
                  <Icon className={`h-3.5 w-3.5 ${cfg.tone}`} />
                  <span className="text-muted-foreground">{cfg.label}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {STATUS_OPTIONS.map((s) => {
                    const c = STATUS_CONFIG[s];
                    const SIcon = c.icon;
                    return (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => update.mutate({ id: item.id, status: s })}
                        disabled={s === item.resolvedStatus}
                      >
                        <SIcon className={`h-3.5 w-3.5 mr-2 ${c.tone}`} />
                        {c.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Delete (custom items only — derived items would just respawn) */}
              {item.kind === "CUSTOM" && !disabled && (
                <button
                  onClick={() => remove.mutate({ id: item.id })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 p-1"
                  title="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {merged.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground/70">
          No requirements yet.
        </p>
      )}
    </div>
  );
}
