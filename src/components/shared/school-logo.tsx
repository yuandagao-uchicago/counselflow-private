"use client";

import { useState } from "react";

// Favicon-based school logo. Uses Google's S2 favicon service when we know
// the school's website domain; falls back to a stylized initials badge so
// the layout never collapses. No API key needed.

type Props = {
  name: string;
  website?: string | null;
  size?: number;
  className?: string;
};

function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Deterministic gradient picker so the same school always gets the same color.
const gradients = [
  "from-violet-500 to-fuchsia-400",
  "from-sky-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-rose-500 to-pink-400",
  "from-indigo-500 to-blue-400",
  "from-lime-500 to-emerald-400",
  "from-yellow-500 to-amber-400",
];

function gradientFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return gradients[Math.abs(h) % gradients.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function SchoolLogo({ name, website, size = 36, className = "" }: Props) {
  const [errored, setErrored] = useState(false);
  const domain = domainFromUrl(website);
  const showFavicon = domain && !errored;
  const grad = gradientFor(name);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${grad} ring-1 ring-foreground/[0.06] ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Always render the colored gradient as the base — the favicon stacks
         on top so partial failures still leave a designed surface. */}
      <span
        className="absolute inset-0 flex items-center justify-center text-white font-semibold tracking-wider"
        style={{ fontSize: Math.max(10, size * 0.35) }}
      >
        {initials(name)}
      </span>
      {showFavicon && (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setErrored(true)}
          className="absolute inset-0 h-full w-full object-cover bg-white/95"
        />
      )}
    </div>
  );
}
