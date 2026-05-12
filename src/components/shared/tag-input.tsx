"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function TagInput({
  value,
  onChange,
  placeholder,
  className,
  badgeClassName,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  badgeClassName?: string;
}) {
  const [input, setInput] = useState("");

  function add(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={`rounded-md border border-foreground/10 bg-foreground/5 px-2 py-1.5 flex flex-wrap gap-1.5 items-center ${className || ""}`}>
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className={`gap-1 pr-1 ${badgeClassName || "bg-[oklch(0.34_0.13_25_/_10%)] text-[oklch(0.66_0.15_75)] border-[oklch(0.34_0.13_25_/_20%)]"}`}
        >
          {tag}
          <button
            type="button"
            className="ml-0.5 rounded-sm hover:bg-foreground/10 p-0.5"
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => input && add(input)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] border-0 bg-transparent h-7 px-1 focus-visible:ring-0 shadow-none"
      />
    </div>
  );
}
