import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title={
        <>
          Pick up where you left off, <span className="italic text-[oklch(0.85_0.15_280)]">case by case.</span>
        </>
      }
      blurb="Your students, drafts, briefs, and approvals — all where you left them, all in one canvas."
      altPrompt="New here?"
      altLabel="Request access →"
      altHref="/sign-up"
    >
      <SignIn
        appearance={{
          baseTheme: dark,
          elements: {
            rootBox: "w-full",
            card: "bg-white/[0.03] border border-white/[0.08] backdrop-blur-md shadow-2xl shadow-black/40",
            headerTitle: "font-serif text-2xl",
            headerSubtitle: "text-white/60",
            socialButtonsBlockButton: "border-white/10 hover:bg-white/[0.04]",
            formFieldInput: "bg-white/[0.03] border-white/10",
            formButtonPrimary:
              "bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.6_0.22_290)] hover:brightness-110 shadow-lg shadow-[oklch(0.65_0.2_265_/_25%)]",
            footerActionLink: "text-[oklch(0.85_0.15_280)] hover:underline",
          },
        }}
      />
    </AuthShell>
  );
}
