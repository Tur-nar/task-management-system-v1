"use client";

import * as React from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, MoreHorizontal, Eye, Pencil, Trash } from "lucide-react";
import { type Department } from "@/lib/api";

const deptColors = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500",
  "bg-indigo-500", "bg-teal-500", "bg-orange-500",
];

interface DepartmentCardProps {
  department: Department;
  index: number;
  isAdmin: boolean;
  onViewDetails: (dept: Department) => void;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
}

export function DepartmentCard({ department, index, isAdmin, onViewDetails, onEdit, onDelete }: DepartmentCardProps) {
  const headName = department.head ? `${department.head.firstName} ${department.head.lastName}` : "Not assigned";

  return (
    <Card className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${deptColors[index % deptColors.length]} flex items-center justify-center`}>
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{department.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">Head: {headName}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />
            }>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full" align="end">
              <DropdownMenuItem onClick={() => onViewDetails(department)}>
                <Eye className="h-3.5 w-3.5" /> View Details
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(department)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit Department
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(department)}>
                    <Trash className="h-3.5 w-3.5" /> Delete Department
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{department.description || "No description"}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold">{department.staffCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Staff</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-lg font-bold">{department.activeTasks}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Tasks</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completion Rate</span>
            <span className="font-semibold">{department.completionRate}%</span>
          </div>
          <Progress value={department.completionRate} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}
