import { currentUser } from "@clerk/nextjs/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName || "Counselor";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return <DashboardClient greeting={greeting} firstName={firstName} />;
}
