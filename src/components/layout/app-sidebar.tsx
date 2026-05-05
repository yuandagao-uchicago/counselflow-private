"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckCircle,
  Settings,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Students",
    href: "/students",
    icon: Users,
  },
  {
    title: "Readiness",
    href: "/readiness",
    icon: FileSpreadsheet,
  },
  {
    title: "Approvals",
    href: "/approvals",
    icon: CheckCircle,
    badge: true,
  },
];

const bottomItems = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: pendingApprovals } = trpc.review.pendingCount.useQuery(undefined, {
    // Refetch every 30s so approvals dropped by other tabs/webhooks appear
    refetchInterval: 30_000,
  });
  const badgeCount = pendingApprovals ?? 0;

  return (
    <Sidebar>
      <SidebarHeader className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.65_0.2_265)] to-[oklch(0.55_0.22_290)] shadow-lg shadow-[oklch(0.65_0.2_265_/_20%)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">CounselFlow</span>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Workflow AI</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      className={
                        isActive
                          ? "bg-gradient-to-r from-[oklch(0.65_0.2_265_/_15%)] to-transparent border-l-2 border-[oklch(0.65_0.2_265)] text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.title}</span>
                      {item.badge && badgeCount > 0 && (
                        <Badge className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-bold bg-gradient-to-r from-[oklch(0.65_0.2_265)] to-[oklch(0.6_0.22_290)] text-white border-0">
                          {badgeCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-4">
        <SidebarMenu>
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname.startsWith(item.href)}
                render={<Link href={item.href} />}
                className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span className="font-medium">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
