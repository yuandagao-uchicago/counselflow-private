"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const VIDEO_URL = "/hero.mp4";

// Instrument Serif is loaded in layout.tsx under --font-serif (Almanac's
// editorial pull font). The literal name is also listed first so we render
// correctly even before the font variable is read.
const SERIF = "'Instrument Serif', var(--font-serif), serif";
const MUTED = "hsl(240 5% 78%)";
const NAVY = "hsl(201 100% 13%)";
const CTA_LABEL = "Join the early circle";

export function LandingHero() {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden text-white"
      style={{ backgroundColor: NAVY }}
    >
      {/* Background video — subtle continuous breath keeps the loop alive */}
      <video
        className="hero-video-breathe absolute inset-0 z-0 h-full w-full object-cover"
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      {/* Darkening layer for text contrast */}
      <div className="absolute inset-0 z-0 bg-black/60" aria-hidden="true" />

      {/* NAV */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-8">
        <Link
          href="/"
          className="animate-fade-rise text-scrim text-3xl tracking-tight text-white"
          style={{ fontFamily: SERIF }}
        >
          CounselFlow
          <sup className="text-xs">®</sup>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/sign-in"
            className="animate-fade-rise-delay sign-in-link text-scrim hidden text-sm transition-colors hover:text-white sm:inline-block"
            style={{ color: MUTED }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="animate-fade-rise-delay-2 liquid-glass cta-link inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-xs text-white transition-transform duration-200 hover:scale-[1.03] sm:px-6 sm:text-sm"
          >
            {CTA_LABEL}
            <ArrowUpRight className="cta-arrow h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-16 pb-24 text-center sm:pt-24 md:pt-28 md:pb-40">
        {/* Eyebrow status tag */}
        <div className="animate-fade-rise mb-8 inline-flex items-center gap-3 sm:mb-10">
          <span className="status-dot block h-1.5 w-1.5 rounded-full bg-white" />
          <span
            className="text-scrim text-[10px] font-medium uppercase sm:text-xs"
            style={{ color: MUTED, letterSpacing: "0.24em" }}
          >
            Private Beta · Summer 2026
          </span>
        </div>

        {/* H1 — forced two-line break + per-word slide reveal */}
        <h1
          className="text-scrim max-w-7xl text-5xl font-normal text-white sm:text-7xl md:text-8xl lg:text-[9rem]"
          style={{
            fontFamily: SERIF,
            letterSpacing: "-0.025em",
            lineHeight: 0.96,
          }}
        >
          <span className="block">
            <span className="word-wrap">
              <span className="word-inner" style={{ animationDelay: "0.3s" }}>
                Where
              </span>
            </span>{" "}
            <span className="word-wrap">
              <span
                className="word-inner"
                style={{ animationDelay: "0.4s", color: MUTED }}
              >
                futures
              </span>
            </span>{" "}
            <span className="word-wrap">
              <span className="word-inner" style={{ animationDelay: "0.5s" }}>
                rise
              </span>
            </span>
          </span>
          <span className="block">
            <span className="word-wrap">
              <span
                className="word-inner"
                style={{ animationDelay: "0.62s", color: MUTED }}
              >
                through quiet counsel.
              </span>
            </span>
          </span>
        </h1>

        <p
          className="animate-fade-rise-delay-3 text-scrim mt-8 max-w-2xl text-base leading-relaxed sm:text-lg"
          style={{ color: MUTED, letterSpacing: "-0.005em" }}
        >
          The workflow operating system for private college counselors. We hold
          the drafts, the deadlines, and the operational weight — you hold the
          relationships.
        </p>

        <div className="animate-fade-rise-delay-4 mt-10 sm:mt-12">
          <Link
            href="/sign-up"
            className="liquid-glass cta-link inline-flex cursor-pointer items-center gap-2.5 rounded-full px-12 py-5 text-base text-white transition-transform duration-200 hover:scale-[1.03] sm:px-14"
          >
            {CTA_LABEL}
            <ArrowUpRight className="cta-arrow h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
