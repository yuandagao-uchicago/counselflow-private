import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { ensureDbUser } from "@/lib/auth-server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure the Clerk user has a matching DB record
  await ensureDbUser();

  return (
    <SidebarProvider>
      {/* Cinematic backdrop — sits behind everything, reacts to theme */}
      <div className="ambient-backdrop" aria-hidden="true" />

      <AppSidebar />
      <div className="relative z-10 flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}
