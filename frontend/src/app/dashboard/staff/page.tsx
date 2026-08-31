"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Users, UserCheck, UserX, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usersApi, departmentsApi, type User, type Department } from "@/lib/api";
import { useAuth } from "@/lib/auth";

import { CreateStaffDialog } from "./_components/create-staff-dialog";
import { EditStaffDialog } from "./_components/edit-staff-dialog";
import { StaffTable } from "./_components/staff-table";
import { StaffProfileSheet } from "./_components/staff-profile-sheet";
import { ToggleStatusDialog } from "./_components/toggle-status-dialog";
import { DeleteUserDialog } from "./_components/delete-user-dialog";

export default function StaffPage() {
  const { user: currentUser } = useAuth();
  const [staff, setStaff] = React.useState<User[]>([]);
  const [supervisors, setSupervisors] = React.useState<User[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("all");

  // Sheet for staff profile
  const [selectedStaff, setSelectedStaff] = React.useState<User | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = React.useState<User | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);

  // Status toggle & delete
  const [toggleTarget, setToggleTarget] = React.useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<User | null>(null);

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  React.useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, supRes, deptRes] = await Promise.all([
        usersApi.getAll(),
        usersApi.getSupervisors(),
        departmentsApi.getAll(),
      ]);
      setStaff(usersRes.users);
      setSupervisors(supRes.supervisors);
      setDepartments(deptRes.departments);
    } catch (error) {
      toast.error("Failed to load staff", {
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = staff.filter((s) => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === "all" || s.departmentId === deptFilter;
    return matchesSearch && matchesDept;
  });

  const summary = {
    total: staff.length,
    active: staff.filter((s) => s.status === "active").length,
    inactive: staff.filter((s) => s.status === "inactive").length,
    supervisors: staff.filter((s) => s.role === "supervisor").length,
  };

  const openEdit = (user: User) => {
    setEditTarget(user);
    setEditOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
            <p className="text-muted-foreground mt-1">Register, manage, and organize team members</p>
          </div>
          {isAdmin && (
            <CreateStaffDialog supervisors={supervisors} departments={departments} currentUserRole={currentUser?.role} onCreated={loadData} />
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Staff", value: summary.total, icon: Users, color: "text-primary dark:text-green", bg: "bg-primary/10 dark:bg-green/10" },
            { label: "Active", value: summary.active, icon: UserCheck, color: "text-success", bg: "bg-success/10" },
            { label: "Inactive", value: summary.inactive, icon: UserX, color: "text-muted-foreground", bg: "bg-muted" },
            { label: "Supervisors", value: summary.supervisors, icon: Shield, color: "text-green", bg: "bg-green/10" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`rounded-xl p-2.5 ${item.bg}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff..." className="pl-9 h-10" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? "all")}>
            <SelectTrigger className="w-[200px] h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {/* Staff Table */}
        <StaffTable
          staff={filtered}
          isAdmin={isAdmin}
          currentUserRole={currentUser?.role}
          onViewProfile={(user) => { setSelectedStaff(user); setSheetOpen(true); }}
          onEdit={openEdit}
          onToggleStatus={setToggleTarget}
          onDelete={setDeleteTarget}
        />
      </div>

      {/* Staff Profile Sheet */}
      <StaffProfileSheet
        staff={selectedStaff} open={sheetOpen} onOpenChange={setSheetOpen}
        isAdmin={isAdmin} onEdit={openEdit} onToggleStatus={setToggleTarget}
      />

      {/* Edit Staff Dialog */}
      <EditStaffDialog
        staff={editTarget} open={editOpen}
        onOpenChange={(open) => { setEditOpen(open); if (!open) setEditTarget(null); }}
        supervisors={supervisors} departments={departments} currentUserRole={currentUser?.role} onUpdated={loadData}
      />

      {/* Toggle Status Dialog */}
      <ToggleStatusDialog
        user={toggleTarget}
        onClose={() => setToggleTarget(null)}
        onToggled={loadData}
      />

      {/* Delete User Dialog */}
      <DeleteUserDialog
        user={deleteTarget}
        onClose={() => { setDeleteTarget(null); if (selectedStaff?.id === deleteTarget?.id) { setSheetOpen(false); setSelectedStaff(null); } }}
        onDeleted={loadData}
      />
    </>
  );
}
