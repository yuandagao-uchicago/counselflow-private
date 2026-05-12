"use client";

import Link from "next/link";
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
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.13_0.018_30)] text-[oklch(0.95_0.018_80)]">
      <div className="ambient-backdrop" />
      <div className="topo-bg pointer-events-none absolute inset-0 text-white/[0.5] opacity-[0.04]" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* Brand pane */}
        <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 border-r border-white/[0.06]">
          <Link href="/" className="group block w-fit">
            <span className="font-display text-2xl font-semibold tracking-tight leading-none text-white">
              Counselflow
            </span>
            <span className="mt-1.5 block h-px w-8 bg-[oklch(0.66_0.15_75)] transition-all group-hover:w-16" />
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
            <Link href="/" className="lg:hidden group block w-fit">
              <span className="font-display text-2xl font-semibold tracking-tight leading-none text-white">
                Counselflow
              </span>
              <span className="mt-1.5 block h-px w-8 bg-[oklch(0.66_0.15_75)] transition-all group-hover:w-16" />
            </Link>

            {/* Clerk widget container — themed via the appearance prop on
               <SignIn>/<SignUp>, but we also style the wrapper for cohesion. */}
            <div>{children}</div>

            <p className="text-center text-xs text-white/55">
              {altPrompt}{" "}
              <Link href={altHref} className="text-[oklch(0.66_0.15_75)] hover:underline">
                {altLabel}
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
