"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, ClipboardList, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { departmentsApi, usersApi, type Department, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";

import { CreateDeptDialog } from "./_components/create-dept-dialog";
import { EditDeptSheet } from "./_components/edit-dept-sheet";
import { DepartmentCard } from "./_components/department-card";
import { DepartmentDetailsSheet } from "./_components/department-details-sheet";
import { DeleteDeptDialog } from "./_components/delete-dept-dialog";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [supervisors, setSupervisors] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Edit sheet
  const [editTarget, setEditTarget] = React.useState<Department | null>(null);
  const [editSheetOpen, setEditSheetOpen] = React.useState(false);

  // Details sheet
  const [detailsTarget, setDetailsTarget] = React.useState<Department | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<Department | null>(null);

  React.useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptRes, supRes] = await Promise.all([
        departmentsApi.getAll(),
        usersApi.getSupervisors(),
      ]);
      setDepartments(deptRes.departments);
      setSupervisors(supRes.supervisors);
    } catch (error) {
      console.error("Failed to load departments:", error);
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const totalStaff = departments.reduce((a, b) => a + b.staffCount, 0);
  const totalTasks = departments.reduce((a, b) => a + b.activeTasks, 0);
  const avgCompletion = departments.length > 0
    ? Math.round(departments.reduce((a, b) => a + b.completionRate, 0) / departments.length)
    : 0;

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

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
            <h2 className="text-2xl font-bold tracking-tight">Departments</h2>
            <p className="text-muted-foreground mt-1">Organize and manage departments and units</p>
          </div>
          {isAdmin && (
            <CreateDeptDialog supervisors={supervisors} onCreated={loadData} />
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: "Departments", value: departments.length, icon: Building2, color: "text-primary dark:text-green", bg: "bg-primary/10 dark:bg-green/10" },
            { label: "Total Staff", value: totalStaff, icon: Users, color: "text-success", bg: "bg-success/10" },
            { label: "Active Tasks", value: totalTasks, icon: ClipboardList, color: "text-warning", bg: "bg-warning/10" },
            { label: "Avg. Completion", value: `${avgCompletion}%`, icon: BarChart3, color: "text-primary dark:text-green", bg: "bg-primary/10 dark:bg-green/10" },
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

        {/* Department Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, index) => (
            <DepartmentCard
              key={dept.id}
              department={dept}
              index={index}
              isAdmin={isAdmin}
              onViewDetails={(d) => { setDetailsTarget(d); setDetailsOpen(true); }}
              onEdit={(d) => { setEditTarget(d); setEditSheetOpen(true); }}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      </div>

      {/* Department Details Sheet */}
      <DepartmentDetailsSheet
        department={detailsTarget}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Edit Department Sheet */}
      <EditDeptSheet
        department={editTarget}
        open={editSheetOpen}
        onOpenChange={(open) => { setEditSheetOpen(open); if (!open) setEditTarget(null); }}
        supervisors={supervisors}
        onUpdated={loadData}
      />

      {/* Delete Department Dialog */}
      <DeleteDeptDialog
        department={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={loadData}
      />
    </>
  );
}
