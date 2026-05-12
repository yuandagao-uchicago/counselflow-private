import type { Metadata } from "next";
import { Inter, Space_Grotesk, Unbounded, JetBrains_Mono, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

// Display font for hero headlines — heavy, modern, AI/tech feel
const unbounded = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Editorial serif — used for student names and section markers. Gives a
// "case file" / clinician's chart feel that signals considered work.
// Loaded as a variable font so the optical-size axis works; CSS picks the
// weight per use site via font-weight.
const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "CounselFlow",
  description:
    "AI-powered workflow operating system for college counselors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${inter.variable} ${spaceGrotesk.variable} ${unbounded.variable} ${jetbrainsMono.variable} ${fraunces.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <Providers>
            {children}
            <Toaster position="bottom-right" />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
