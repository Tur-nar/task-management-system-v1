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
import { MoreHorizontal, Mail, Shield, Pencil, Eye, Trash } from "lucide-react";
import { type User } from "@/lib/api";

interface StaffTableProps {
  staff: User[];
  isAdmin: boolean;
  currentUserRole?: string;
  onViewProfile: (user: User) => void;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onDelete: (user: User) => void;
}

export function StaffTable({ staff, isAdmin, currentUserRole, onViewProfile, onEdit, onToggleStatus, onDelete }: StaffTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No staff match your filters.
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member) => {
                const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`;
                const fullName = `${member.firstName} ${member.lastName}`;
                const isSupervisor = member.role === "supervisor" || member.role === "admin" || member.role === "super_admin";
                const roleLabel = member.role === "super_admin" ? "Super Admin" : member.role === "admin" ? "Admin" : member.role === "supervisor" ? "Supervisor" : "Staff";
                const canManage = isAdmin && member.role !== "super_admin" && !(currentUserRole === "admin" && member.role === "admin");

                return (
                  <TableRow key={member.id} className="group cursor-pointer"
                    onClick={() => onViewProfile(member)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />{member.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{member.department?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${member.role === 'admin' ? 'bg-destructive/10 text-destructive border-destructive/20' : isSupervisor ? "bg-green/10 text-green border-green/20" : "bg-muted text-muted-foreground border-border"}`}>
                        {isSupervisor && <Shield className="h-3 w-3 mr-1" />}{roleLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${member.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-border"}`}>
                        {member.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()} />
                          }>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => onViewProfile(member)}>
                              <Eye className="h-3.5 w-3.5" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(member)}>
                              <Pencil className="h-3.5 w-3.5" /> Edit Staff
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={member.status === "active" ? "text-destructive" : "text-success"}
                              onClick={() => onToggleStatus(member)}>
                              <Pencil className="h-3.5 w-3.5" /> {member.status === "active" ? "Deactivate" : "Reactivate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(member)}>
                              <Trash className="h-3.5 w-3.5" /> Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
