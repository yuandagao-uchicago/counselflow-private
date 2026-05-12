import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  Sparkles,
  ArrowRight,
  ListChecks,
  GraduationCap,
  CheckCircle2,
  Mail,
  CalendarCheck,
  ShieldCheck,
  Bookmark,
} from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.13_0.018_30)] text-[oklch(0.95_0.018_80)]">
      {/* Cinematic backdrop — three radial pools + grain (mirrors the app shell) */}
      <div className="ambient-backdrop" />
      <div className="topo-bg pointer-events-none absolute inset-0 text-white/[0.5] opacity-[0.04]" />

      <div className="relative">
        <Header />
        <Hero />
        <PullQuote />
        <FeatureGrid />
        <ClosingCTA />
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[oklch(0.13_0.018_30)/_60%]">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] shadow-lg shadow-[oklch(0.34_0.13_25_/_25%)] ring-1 ring-white/10">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-serif text-xl font-medium tracking-tight">
            Counsel<span className="text-[oklch(0.66_0.15_75)]">Flow</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3 md:gap-5 text-sm">
          <Link
            href="/sign-in"
            className="text-white/70 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[oklch(0.18_0.022_30)] font-medium hover:bg-white/90 transition-colors"
          >
            Request access
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 md:px-10 pt-16 md:pt-28 pb-24 md:pb-36">
      <div className="grid gap-12 md:grid-cols-12 md:gap-16 items-end">
        <div className="md:col-span-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/70">
              Now in private beta
            </span>
          </div>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-[5.25rem] leading-[0.95] tracking-tight font-medium">
            An operating system <br />
            for the{" "}
            <span className="italic text-[oklch(0.66_0.15_75)]">counselor&apos;s</span>{" "}
            most <br className="hidden md:inline" /> considered work.
          </h1>
          <p className="mt-8 max-w-xl text-base md:text-lg text-white/70 leading-relaxed">
            CounselFlow is the workspace for independent college counselors —
            an AI second-pair-of-hands that drafts, tracks, and remembers, so you
            can stay in the room with the student.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] text-white font-medium shadow-xl shadow-[oklch(0.34_0.13_25_/_30%)] hover:brightness-110 transition-all"
            >
              Request access
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 text-white/85 hover:bg-white/[0.04] transition-colors"
            >
              I have an account
            </Link>
          </div>
        </div>

        {/* Floating instrument-panel preview */}
        <div className="md:col-span-4 relative hidden md:block">
          <div className="absolute -top-12 -right-8 h-72 w-72 rounded-full bg-[oklch(0.65_0.2_280)]/20 blur-3xl" />
          <PreviewCard />
        </div>
      </div>
    </section>
  );
}

function PreviewCard() {
  // Stylized "case file" mockup — a static representation of what the app
  // looks like, meant to evoke the feel without showing real student data.
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 shadow-2xl shadow-black/40">
      <div className="topo-bg absolute inset-0 text-white/[0.5] opacity-[0.05] rounded-2xl pointer-events-none" />
      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-sm font-semibold text-white shadow">
            MC
          </div>
          <div>
            <p className="font-serif text-base">Maya Chen</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
              Senior · CS
            </p>
          </div>
          <span className="ml-auto text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
            Applications
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Pill label="Apps" value="9" />
          <Pill label="Open" value="14" />
          <Pill label="Next" value="3d" />
        </div>
        <div className="space-y-1.5">
          <PreviewRow label="Stanford supplement" tone="amber" />
          <PreviewRow label="MIT short essays" tone="rose" />
          <PreviewRow label="CMU portfolio" tone="emerald" />
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] py-2">
      <p className="num-display text-base font-medium">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-white/45 mt-0.5">{label}</p>
    </div>
  );
}

function PreviewRow({ label, tone }: { label: string; tone: "amber" | "rose" | "emerald" }) {
  const dot = {
    amber: "bg-amber-400",
    rose: "bg-rose-400",
    emerald: "bg-emerald-400",
  }[tone];
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/[0.02]">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="text-xs text-white/80 truncate">{label}</span>
    </div>
  );
}

function PullQuote() {
  return (
    <section className="relative border-y border-white/[0.06] py-20 md:py-28 bg-white/[0.015]">
      <div className="max-w-4xl mx-auto px-6 md:px-10 text-center">
        <p className="font-serif text-2xl md:text-4xl leading-snug tracking-tight text-white/90">
          &ldquo;We&apos;re building the operating system{" "}
          <span className="italic text-[oklch(0.66_0.15_75)]">around</span>{" "}
          a great counselor — not trying to{" "}
          <span className="italic text-[oklch(0.66_0.15_75)]">replace</span>{" "}
          one.&rdquo;
        </p>
        <p className="mt-6 text-xs uppercase tracking-[0.32em] text-white/45">
          — The CounselFlow design principle
        </p>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      icon: ListChecks,
      eyebrow: "Cases",
      title: "Every student, end-to-end.",
      copy: "One canvas per student — phase journey, applications, milestones, recommenders, deadlines. No more scattered docs.",
    },
    {
      icon: Mail,
      eyebrow: "Outreach",
      title: "Drafts in the counselor's voice.",
      copy: "Weekly parent and student updates pulled from real activity. Every word goes through your approval queue first.",
    },
    {
      icon: CalendarCheck,
      eyebrow: "Meetings",
      title: "Brief in, summary out.",
      copy: "AI prep brief before every meeting. Recall.ai capture, AI summary, action items — straight into the case.",
    },
    {
      icon: GraduationCap,
      eyebrow: "Funding",
      title: "Match scholarships, transparently.",
      copy: "Per-student matcher with an explainable ranking — eligibility, award, urgency, effort. No black box.",
    },
    {
      icon: CheckCircle2,
      eyebrow: "Approvals",
      title: "Counselor-in-the-loop, always.",
      copy: "Every externally-meaningful AI output lands in a review queue. You edit, you approve, then it sends.",
    },
    {
      icon: ShieldCheck,
      eyebrow: "Trust",
      title: "Source basis on every output.",
      copy: "Each AI artifact carries its sources, confidence, and model. You see why before you trust how.",
    },
  ];
  return (
    <section className="relative max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
      <div className="mb-14 md:mb-20 max-w-3xl">
        <span className="section-eyebrow">What&apos;s inside</span>
        <h2 className="font-serif text-4xl md:text-5xl tracking-tight font-medium mt-3 leading-tight">
          A workspace built for the parts of the work{" "}
          <span className="italic text-white/60">only you</span> can do.
        </h2>
      </div>
      <div className="grid gap-px bg-white/[0.06] md:grid-cols-2 lg:grid-cols-3 rounded-2xl overflow-hidden border border-white/[0.06]">
        {features.map((f, i) => (
          <FeatureCell key={i} {...f} />
        ))}
      </div>
    </section>
  );
}

function FeatureCell({
  icon: Icon,
  eyebrow,
  title,
  copy,
}: {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="group relative bg-[oklch(0.13_0.018_30)] p-7 md:p-8 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10 text-white/80 group-hover:text-[oklch(0.66_0.15_75)] transition-colors">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
        </div>
        <span className="section-eyebrow">{eyebrow}</span>
      </div>
      <h3 className="font-serif text-xl md:text-[1.4rem] leading-snug tracking-tight font-medium mb-2.5">
        {title}
      </h3>
      <p className="text-sm text-white/60 leading-relaxed">{copy}</p>
    </div>
  );
}

function ClosingCTA() {
  return (
    <section className="relative max-w-4xl mx-auto px-6 md:px-10 py-24 md:py-32 text-center">
      <Bookmark className="h-6 w-6 text-[oklch(0.66_0.15_75)] mx-auto mb-6 opacity-70" />
      <h2 className="font-serif text-4xl md:text-6xl tracking-tight font-medium leading-[1.05]">
        For the counselors <br />
        whose <span className="italic">work</span> deserves a tool to match.
      </h2>
      <p className="mt-7 text-white/65 max-w-lg mx-auto leading-relaxed">
        We&apos;re onboarding a small group of independent counselors. Tell us about
        your practice and we&apos;ll be in touch.
      </p>
      <div className="mt-10">
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] text-white font-medium shadow-xl shadow-[oklch(0.34_0.13_25_/_30%)] hover:brightness-110 transition-all"
        >
          Request access
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] py-10 px-6 md:px-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
        <span>© {new Date().getFullYear()} CounselFlow</span>
        <span className="font-serif italic">Operating system for considered work</span>
        <div className="flex items-center gap-5">
          <Link href="/sign-in" className="hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/sign-up" className="hover:text-white transition-colors">
            Request access
          </Link>
        </div>
      </div>
    </footer>
  );
}
