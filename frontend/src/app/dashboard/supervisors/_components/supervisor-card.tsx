"use client";

import * as React from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail, Building2, MoreHorizontal, ArrowRightLeft, Eye
} from "lucide-react";
import { type SupervisorData } from "./types";

interface SupervisorCardProps {
  supervisor: SupervisorData;
  isAdmin: boolean;
  onViewTeam: (supervisor: SupervisorData) => void;
  onReassign: (supervisor: SupervisorData) => void;
}

export function SupervisorCard({ supervisor, isAdmin, onViewTeam, onReassign }: SupervisorCardProps) {
  return (
    <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border-2 border-green/30">
              <AvatarFallback className="text-sm font-bold bg-green/10 text-green">
                {supervisor.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base font-semibold">{supervisor.name}</CardTitle>
              <CardDescription className="flex flex-col gap-0.5 mt-0.5">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />{supervisor.department}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />{supervisor.email}
                </span>
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full" align="end">
              <DropdownMenuItem onClick={() => onViewTeam(supervisor)}>
                <Eye className="h-3.5 w-3.5" /> View Team
              </DropdownMenuItem>
              {isAdmin && supervisor.teamSize > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onReassign(supervisor)}>
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Reassign Members
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold">{supervisor.teamSize}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Team Size</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold">{supervisor.activeTasks}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold text-primary dark:text-green">{supervisor.overdueAlerts}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overdue</p>
          </div>
        </div>

        {/* Overdue alerts */}
        {supervisor.overdueAlerts > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Team Status</span>
              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                {supervisor.overdueAlerts} overdue alert{supervisor.overdueAlerts > 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        )}

        {/* Team Members preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team Members</p>
            <Button variant="ghost" size="sm" className="h-6 text-xs text-primary dark:text-green"
              onClick={() => onViewTeam(supervisor)}>
              View All
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {supervisor.teamMembers.length === 0 ? (
              <span className="text-xs text-muted-foreground">No team members assigned</span>
            ) : (
              supervisor.teamMembers.slice(0, 5).map((member) => (
                <Badge key={member.id} variant="outline" className="text-[10px] bg-muted/50">
                  {member.name}
                </Badge>
              ))
            )}
            {supervisor.teamMembers.length > 5 && (
              <Badge variant="outline" className="text-[10px] bg-muted/50">
                +{supervisor.teamMembers.length - 5} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
