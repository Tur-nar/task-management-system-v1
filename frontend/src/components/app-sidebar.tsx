"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Target,
  Bell,
  Users,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  KeyRound,
  MessageSquareWarning,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { ChangePasswordDialog } from "@/components/change-password-dialog";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tasks",
    url: "/dashboard/tasks",
    icon: ClipboardList,
  },
  {
    title: "Targets",
    url: "/dashboard/targets",
    icon: Target,
  },
  {
    title: "Performance",
    url: "/dashboard/performance",
    icon: BarChart3,
  },
  {
    title: "Notifications",
    url: "/dashboard/notifications",
    icon: Bell,
  },
  {
    title: "Complaints",
    url: "/dashboard/complaints",
    icon: MessageSquareWarning,
  },
];

const managementNavItems = [
  {
    title: "Staff",
    url: "/dashboard/staff",
    icon: Users,
  },
  {
    title: "Departments",
    url: "/dashboard/departments",
    icon: Building2,
  },
  {
    title: "Supervisors",
    url: "/dashboard/supervisors",
    icon: Shield,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);

  const userInitials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    : "??";
  const userName = user
    ? `${user.firstName} ${user.lastName}`
    : "Loading...";
  const userEmail = user?.email || "";
  const userRole = user?.role || "staff";

  // Only show management section for admin & supervisor
  const showManagement = userRole === "super_admin" || userRole === "admin" || userRole === "supervisor";

  return (
    <Sidebar collapsible="icon" className="border-r-0 transition-all duration-200">
      <SidebarHeader className="px-4 py-4 group-data-[collapsible=icon]:px-2">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-md group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7 group-data-[collapsible=icon]:text-xs bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm shrink-0 transition-transform duration-200 group-hover:scale-105">
            Ms
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
              Msspaceglobal
            </span>
            <span className="text-[10px] uppercase tracking-widest text-sidebar-primary opacity-80">
              Task Manager
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 group-data-[collapsible=icon]:px-0">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 px-3 mb-1">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.url ||
                  (item.url !== "/dashboard" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-10 transition-all duration-200"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showManagement && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 px-3 mb-1">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managementNavItems.map((item) => {
                  const isActive = pathname === item.url || pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={isActive}
                        tooltip={item.title}
                        className="h-10 transition-all duration-200"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors duration-200 group" />
            }
          >
            <Avatar className="h-8 w-8 border border-sidebar-primary/30">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-medium text-sidebar-foreground leading-tight">
                {userName}
              </p>
              <p className="text-[11px] text-sidebar-foreground/60">
                {userEmail}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{
                userRole === 'super_admin' ? 'Super Admin' :
                  userRole === 'admin' ? 'Admin' :
                  userRole === 'supervisor' ? 'Supervisor' : 'Staff'
              }</span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
      <EditProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </Sidebar>
  );
}
