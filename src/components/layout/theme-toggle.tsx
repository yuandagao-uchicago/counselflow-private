"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const subscribeMount = () => () => {};
const getMountedClient = () => true;
const getMountedServer = () => false;

/**
 * Simple click-to-toggle between light and dark. We dropped the dropdown
 * variant for reliability — one click, immediate response.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Hydration gate: SSR renders the placeholder; client switches after mount.
  // useSyncExternalStore is the React-19-blessed pattern (avoids
  // setState-in-effect lint and is server-render-safe).
  const mounted = useSyncExternalStore(subscribeMount, getMountedClient, getMountedServer);

  // Render a stable placeholder matching layout until the client mounts.
  // Avoids a hydration flash and keeps the top bar from jumping.
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 relative overflow-hidden"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun
        className={`h-4 w-4 transition-all ${
          isDark ? "rotate-90 scale-0" : "rotate-0 scale-100"
        }`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all ${
          isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0"
        }`}
      />
    </Button>
  );
}
