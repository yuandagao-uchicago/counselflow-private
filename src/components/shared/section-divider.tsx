// Editorial section header. Sits above a group of cards to give a dense
// page rhythmic breaks — eyebrow label + hairline rule + optional aside.

export function SectionDivider({
  label,
  number,
  aside,
}: {
  label: string;
  number?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 pt-2">
      {number && (
        <span className="num-display text-xs text-muted-foreground/60 tabular-nums">
          {number}
        </span>
      )}
      <span className="section-eyebrow">{label}</span>
      <div className="hair-rule flex-1" />
      {aside && <span className="text-xs text-muted-foreground/70">{aside}</span>}
    </div>
  );
}
