import { requireSession } from "@/lib/auth-server";

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Good morning, {session.user.name?.split(" ")[0] || "Counselor"}.
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Active Students" value="0" />
        <DashboardCard title="Upcoming Meetings" value="0" />
        <DashboardCard title="Pending Approvals" value="0" />
        <DashboardCard title="Overdue Tasks" value="0" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Today&apos;s Priorities</h2>
          <p className="text-sm text-muted-foreground">
            No priorities yet. Add students to get started.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Upcoming Deadlines</h2>
          <p className="text-sm text-muted-foreground">
            No upcoming deadlines.
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
