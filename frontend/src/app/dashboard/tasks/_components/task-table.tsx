"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar, ArrowUpDown, MoreHorizontal, Pencil, Eye, Trash
} from "lucide-react";
import { type Task } from "@/lib/api";
import { statusConfig, priorityConfig } from "./task-status-config";

interface TaskTableProps {
  tasks: Task[];
  canEdit: boolean;
  canDelete: boolean;
  onViewDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: string) => void;
}

export function TaskTable({
  tasks, canEdit, canDelete, onViewDetails, onEdit, onDelete, onStatusChange,
}: TaskTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table className="max-w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">
                <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Task <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Deadline <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No tasks match your filters.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => {
                const status = statusConfig[task.status] || statusConfig.not_started;
                const priority = priorityConfig[task.priority] || priorityConfig.medium;
                const assigneeName = task.assignee
                  ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned";
                const initials = task.assignee
                  ? `${task.assignee.firstName.charAt(0)}${task.assignee.lastName.charAt(0)}` : "??";

                return (
                  <TableRow key={task.id} className="group cursor-pointer"
                    onClick={() => onViewDetails(task)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {task?.description?.length ? task?.description?.length > 150 ? task?.description?.slice(0, 150) + "..." : task?.description : "No description"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{assigneeName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{task.department?.name || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${status.style}`}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${priority.style}`}>{priority.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()} />
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="w-full"
                          align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => onViewDetails(task)}>
                            <Eye className="h-3.5 w-3.5" /> View Details
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem onClick={() => onEdit(task)}>
                              <Pencil className="h-3.5 w-3.5" /> Edit Task
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {task.status !== "in_progress" && task.status !== "completed" && task.status !== "overdue" && task.status !== "completed_late" && (
                            <DropdownMenuItem onClick={() => onStatusChange(task, "in_progress")}>
                              <Pencil className="h-3.5 w-3.5" /> Mark In Progress
                            </DropdownMenuItem>
                          )}
                          {task.status !== "completed" && task.status !== "completed_late" && (
                            <DropdownMenuItem onClick={() => onStatusChange(task, "completed")}>
                              <Pencil className="h-3.5 w-3.5" /> {task.status === "overdue" ? "Complete (Late)" : "Mark Completed"}
                            </DropdownMenuItem>
                          )}
                          {(task.status === "completed" || task.status === "in_progress") && (
                            <DropdownMenuItem onClick={() => onStatusChange(task, "not_started")}>
                              <Pencil className="h-3.5 w-3.5" /> Reset to Not Started
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(task)}>
                                <Trash className="h-3.5 w-3.5" /> Delete Task
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
