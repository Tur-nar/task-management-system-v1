"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Building2, Calendar, Clock, User, Shield, Pencil,
} from "lucide-react";
import { type User as UserType } from "@/lib/api";

interface StaffProfileSheetProps {
  staff: UserType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onEdit: (staff: UserType) => void;
  onToggleStatus: (staff: UserType) => void;
}

export function StaffProfileSheet({ staff, open, onOpenChange, isAdmin, onEdit, onToggleStatus }: StaffProfileSheetProps) {
  if (!staff) return null;

  const m = staff;
  const initials = `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`;
  const fullName = `${m.firstName} ${m.lastName}`;
  const roleLabel = m.role === "super_admin" ? "Super Admin" : m.role === "admin" ? "Admin" : m.role === "supervisor" ? "Supervisor" : "Staff";
  const supervisorName = m.supervisor ? `${m.supervisor.firstName} ${m.supervisor.lastName}` : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20 dark:border-green/20">
              <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>{fullName}</SheetTitle>
              <SheetDescription>{m.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 space-y-6 pb-6">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={m.role === "admin" ? "bg-destructive/10 text-destructive border-destructive/20" : m.role === "supervisor" || m.role === "super_admin"
              ? "bg-green/10 text-green border-green/20" : "bg-muted text-muted-foreground border-border"}>
              {m.role !== "staff" && <Shield className="h-3 w-3 mr-1" />}{roleLabel}
            </Badge>
            <Badge variant="outline" className={m.status === "active"
              ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
              {m.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium mt-0.5">{m.department?.name || "Not assigned"}</p>
              </div>
            </div>

            {supervisorName && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Supervisor</p>
                  <p className="text-sm font-medium mt-0.5">{supervisorName}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm font-medium mt-0.5">
                  {new Date(m.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            {m.lastLogin && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Login</p>
                  <p className="text-sm font-medium mt-0.5">
                    {new Date(m.lastLogin).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            )}

            {m.performance && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Performance</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-lg font-bold">{m.performance.performanceScore}%</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-lg font-bold">{m.performance.tasksCompleted}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-lg font-bold text-success">{m.performance.tasksOnTime}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">On Time</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-lg font-bold text-destructive">{m.performance.tasksLate}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Late</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {isAdmin && m.role !== "super_admin" && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                    onClick={() => { onOpenChange(false); onEdit(m); }}>
                    <Pencil className="h-3.5 w-3.5" /> Edit Staff
                  </Button>
                  <Button size="sm" variant="outline"
                    className={`flex-1 ${m.status === "active" ? "text-destructive hover:bg-destructive/10" : "text-success hover:bg-success/10"}`}
                    onClick={() => onToggleStatus(m)}>
                    {m.status === "active" ? "Deactivate" : "Reactivate"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
