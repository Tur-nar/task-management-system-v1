"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/tasks": "Tasks",
  "/dashboard/targets": "Targets",
  "/dashboard/performance": "Performance",
  "/dashboard/notifications": "Notifications",
  "/dashboard/staff": "Staff Management",
  "/dashboard/departments": "Departments",
  "/dashboard/supervisors": "Supervisors",
  "/dashboard/complaints": "Complaints",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageTitle = breadcrumbMap[pathname] || "Dashboard";
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth context will handle redirect, but prevent flash
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-xl px-4">
          <SidebarTrigger className="-ml-1 h-8 w-8" />
          <div className="flex-1">
            <h1 className="text-sm font-semibold">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : user.role === 'supervisor' ? 'Supervisor' : 'Staff'}
              </span>
            )}
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
