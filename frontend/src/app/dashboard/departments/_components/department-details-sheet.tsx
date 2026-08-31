"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Building2, Users, ClipboardList, Shield } from "lucide-react";
import { type Department } from "@/lib/api";

interface DepartmentDetailsSheetProps {
  department: Department | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepartmentDetailsSheet({ department, open, onOpenChange }: DepartmentDetailsSheetProps) {
  if (!department) return null;

  const headName = department.head ? `${department.head.firstName} ${department.head.lastName}` : "Not assigned";
  const headInitials = department.head
    ? `${department.head.firstName.charAt(0)}${department.head.lastName.charAt(0)}`
    : "NA";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 dark:bg-green/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary dark:text-green" />
            </div>
            <div>
              <SheetTitle>{department.name}</SheetTitle>
              <SheetDescription>Department details and team overview</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 space-y-6 pb-6">
          {/* Description */}
          {department.description && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</p>
              <p className="text-sm leading-relaxed">{department.description}</p>
            </div>
          )}

          {/* Department Head */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department Head</p>
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-[10px] font-bold bg-green/10 text-green">
                  {headInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{headName}</p>
                {department.head && (
                  <p className="text-xs text-muted-foreground">{department.head.email}</p>
                )}
              </div>
              {department.head && (
                <Badge variant="outline" className="ml-auto text-[9px] bg-green/10 text-green border-green/20">
                  <Shield className="h-3 w-3 mr-1" /> Head
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Stats */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Statistics</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xl font-bold">{department.staffCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Staff Members</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xl font-bold">{department.activeTasks}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Active Tasks</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xl font-bold">{department.completedTasks}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xl font-bold">{department.totalTasks}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Total Tasks</p>
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-bold text-lg">{department.completionRate}%</span>
            </div>
            <Progress value={department.completionRate} className="h-2" />
          </div>

          <Separator />

          {/* Staff list */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Staff Members ({department.staffCount})
            </p>
            {department.staff && department.staff.length > 0 ? (
              department.staff.map((member: any) => {
                const fullName = `${member.firstName} ${member.lastName}`;
                const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`;
                const isSupervisor = member.role === "supervisor";

                return (
                  <div key={member.id} className="flex items-center gap-3 rounded-lg p-2.5 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    {isSupervisor && (
                      <Badge variant="outline" className="text-[9px] bg-green/10 text-green border-green/20 shrink-0">
                        <Shield className="h-3 w-3 mr-1" /> Supervisor
                      </Badge>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No staff assigned yet</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
