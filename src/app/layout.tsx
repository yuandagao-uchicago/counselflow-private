import type { Metadata } from "next";
import { DM_Sans, Bodoni_Moda, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

// Almanac aesthetic: parchment + oxblood + ink. Body sans is DM Sans —
// geometric, characterful, intentionally not Inter. Display is Bodoni Moda
// (variable, optical sizing) for dramatic Didone headlines. Editorial pulls
// use Instrument Serif's italic. Mono for tabular data only.
const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  axes: ["opsz"],
});

const bodoniModa = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
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
        className={`${dmSans.variable} ${bodoniModa.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col" suppressHydrationWarning>
          <Providers>
            {children}
            <Toaster position="bottom-right" />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
