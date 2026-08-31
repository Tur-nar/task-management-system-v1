"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ArrowRightLeft } from "lucide-react";
import { type SupervisorData } from "./types";

interface TeamSheetProps {
  supervisor: SupervisorData | null;
  onClose: () => void;
  isAdmin: boolean;
  onReassign: (supervisor: SupervisorData) => void;
}

export function TeamSheet({ supervisor, onClose, isAdmin, onReassign }: TeamSheetProps) {
  return (
    <Sheet open={!!supervisor} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        {supervisor && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-green/30">
                  <AvatarFallback className="text-sm font-bold bg-green/10 text-green">
                    {supervisor.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle>{supervisor.name}&apos;s Team</SheetTitle>
                  <SheetDescription>
                    {supervisor.teamSize} team member{supervisor.teamSize !== 1 ? "s" : ""} • {supervisor.department}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="px-4 space-y-4 pb-6">
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                  <p className="text-base font-bold">{supervisor.teamSize}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Members</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                  <p className="text-base font-bold">{supervisor.activeTasks}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Active</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                  <p className="text-base font-bold text-destructive">{supervisor.overdueAlerts}</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Overdue</p>
                </div>
              </div>

              <Separator />

              {/* Team Members list */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team Members</p>
                {supervisor.teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No team members assigned</p>
                ) : (
                  supervisor.teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 rounded-lg p-2.5 bg-muted/30 hover:bg-muted/50 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
                          {member.name.split(" ").map((n) => n.charAt(0)).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <Badge variant="outline"
                        className={`text-[9px] shrink-0 ${member.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-border"}`}>
                        {member.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>

              {/* Reassign action */}
              {isAdmin && supervisor.teamSize > 0 && (
                <>
                  <Separator />
                  <Button variant="outline" className="w-full gap-2"
                    onClick={() => { onReassign(supervisor); onClose(); }}>
                    <ArrowRightLeft className="h-4 w-4" /> Reassign Members
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
