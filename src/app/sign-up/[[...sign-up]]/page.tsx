import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Request access"
      title={
        <>
          A workspace built for the parts of the work <span className="italic text-[oklch(0.66_0.15_75)]">only you</span> can do.
        </>
      }
      blurb="We're onboarding a small group of independent counselors. Create your account and we'll be in touch."
      altPrompt="Already have an account?"
      altLabel="Sign in →"
      altHref="/sign-in"
    >
      <SignUp
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
              "bg-gradient-to-r from-[oklch(0.34_0.13_25)] to-[oklch(0.34_0.13_25)] hover:brightness-110 shadow-lg shadow-[oklch(0.34_0.13_25_/_25%)]",
            footerActionLink: "text-[oklch(0.66_0.15_75)] hover:underline",
          },
        }}
      />
    </AuthShell>
  );
}
