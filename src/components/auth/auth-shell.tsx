"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

// Split-pane shell for sign-in / sign-up. Brand & positioning on the left,
// the Clerk widget on the right. Renders the same cinematic backdrop as the
// landing page so first-touch and sign-in feel like one product.

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  blurb: string;
  altPrompt: string;
  altLabel: string;
  altHref: string;
  children: React.ReactNode;
};

export function AuthShell({ eyebrow, title, blurb, altPrompt, altLabel, altHref, children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.08_0.02_280)] text-[oklch(0.96_0.005_280)]">
      <div className="ambient-backdrop" />
      <div className="topo-bg pointer-events-none absolute inset-0 text-white/[0.5] opacity-[0.04]" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* Brand pane */}
        <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 border-r border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] shadow-lg shadow-[oklch(0.65_0.2_265_/_25%)] ring-1 ring-white/10">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-serif text-xl font-medium tracking-tight">
              Counsel<span className="text-[oklch(0.78_0.18_280)]">Flow</span>
            </span>
          </Link>

          <div className="max-w-lg space-y-6">
            <span className="section-eyebrow text-white/55">{eyebrow}</span>
            <h1 className="font-serif text-4xl xl:text-5xl tracking-tight font-medium leading-[1.05]">
              {title}
            </h1>
            <p className="text-white/65 leading-relaxed">{blurb}</p>
          </div>

          <p className="text-xs text-white/35 font-serif italic">
            Operating system for considered work.
          </p>
        </aside>

        {/* Form pane */}
        <main className="relative flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile-only brand header — desktop has the side pane */}
            <Link href="/" className="lg:hidden flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] shadow ring-1 ring-white/10">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-serif text-xl font-medium tracking-tight">
                Counsel<span className="text-[oklch(0.78_0.18_280)]">Flow</span>
              </span>
            </Link>

            {/* Clerk widget container — themed via the appearance prop on
               <SignIn>/<SignUp>, but we also style the wrapper for cohesion. */}
            <div>{children}</div>

            <p className="text-center text-xs text-white/55">
              {altPrompt}{" "}
              <Link href={altHref} className="text-[oklch(0.85_0.15_280)] hover:underline">
                {altLabel}
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
