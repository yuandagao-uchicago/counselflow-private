import { type LucideIcon } from "lucide-react";

// Editorial empty state — replaces the bare icon-and-text pattern. Uses
// a layered ornament (ring + soft glow + icon) and serif-italic copy so
// "no data yet" feels intentional instead of broken.

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "primary";
};

export function EmptyState({ icon: Icon, title, description, action, tone = "neutral" }: Props) {
  const ringClass =
    tone === "primary"
      ? "ring-primary/20 bg-primary/[0.06] text-primary"
      : "ring-foreground/[0.06] bg-foreground/[0.03] text-muted-foreground/70";
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div className="relative mb-4">
        {/* Soft glow halo */}
        <div
          className={
            tone === "primary"
              ? "absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150"
              : "absolute inset-0 rounded-full bg-foreground/[0.04] blur-2xl scale-150"
          }
        />
        {/* Icon ring */}
        <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${ringClass}`}>
          <Icon className="h-5 w-5" strokeWidth={1.6} />
        </div>
      </div>
      <p className="font-serif italic text-base text-foreground/85">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground/70 mt-1.5 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
