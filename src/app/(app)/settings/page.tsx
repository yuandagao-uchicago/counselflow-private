import { Suspense } from "react";
import { UserProfile } from "@clerk/nextjs";
import { IntegrationsPanel } from "@/components/integrations/integrations-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and integrations</p>
      </div>

      <Suspense fallback={<div className="h-48 rounded-2xl bg-card" />}>
        <IntegrationsPanel />
      </Suspense>

      <div className="rounded-2xl border border-foreground/[0.06] bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-transparent shadow-none border-0",
            },
          }}
        />
      </div>
    </div>
  );
}
