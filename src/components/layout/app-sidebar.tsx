"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckCircle,
  Settings,
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
      <SidebarHeader className="px-5 pt-6 pb-4">
        <Link href="/dashboard" className="group block">
          <span className="font-display text-2xl font-semibold tracking-tight leading-none">
            Counselflow
          </span>
          <span className="mt-1.5 block h-px w-8 bg-[var(--almanac-brass)] transition-all group-hover:w-16" />
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
                          ? "relative bg-[var(--almanac-oxblood)]/[0.08] border-l-2 border-[var(--almanac-oxblood)] text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors border-l-2 border-transparent"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.badge && badgeCount > 0 && (
                        <Badge className="ml-auto h-5 min-w-5 px-1.5 num-mono text-[10px] font-medium bg-[var(--almanac-oxblood)] text-[var(--almanac-paper)] border-0 ring-1 ring-[var(--almanac-brass)]/30">
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
