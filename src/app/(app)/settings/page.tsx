import { requireSession } from "@/lib/auth-server";

export default async function SettingsPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account</p>
      </div>

      <div className="rounded-lg border bg-card p-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{session.user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{session.user.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
