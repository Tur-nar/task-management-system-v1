"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usersApi, type User, type Department } from "@/lib/api";

interface EditStaffDialogProps {
  staff: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supervisors: User[];
  departments: Department[];
  currentUserRole?: string;
  onUpdated: () => Promise<void>;
}

export function EditStaffDialog({ staff, open, onOpenChange, supervisors, departments, currentUserRole, onUpdated }: EditStaffDialogProps) {
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    role: "staff", departmentId: "", supervisorId: "",
  });

  React.useEffect(() => {
    if (staff) {
      setForm({
        role: staff.role,
        departmentId: staff.departmentId || "",
        supervisorId: staff.supervisorId || "",
      });
    }
  }, [staff]);

  // Filter supervisors by selected department when role is staff
  const filteredSupervisors = form.role === "staff" && form.departmentId
    ? supervisors.filter((s: any) => s.department.id === form.departmentId)
    : supervisors;

  const handleSave = async () => {
    if (!staff) return;
    setSaving(true);
    const toastId = toast.loading("Updating staff details...");
    try {
      await usersApi.update(staff.id, {
        role: form.role,
        departmentId: form.departmentId || null,
        supervisorId: form.role === "staff" ? (form.supervisorId || null) : null,
      } as Partial<User>);
      toast.success("Staff updated", {
        id: toastId,
        description: `${staff.firstName} ${staff.lastName}'s details have been updated.`,
      });
      onOpenChange(false);
      await onUpdated();
    } catch (error) {
      toast.error("Failed to update staff", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!staff) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit Staff</DialogTitle>
          <DialogDescription>
            Update {staff.firstName} {staff.lastName}&apos;s role, department, or supervisor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={form.departmentId || undefined} onValueChange={(v) => setForm({ ...form, departmentId: v ?? "", supervisorId: "" })}>
              <SelectTrigger>
                <SelectValue placeholder="Select department">
                  {departments.find((d) => d.id === form.departmentId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? "staff", supervisorId: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                {currentUserRole === 'super_admin' && (
                  <SelectItem value="admin">Admin</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {form.role === "staff" && (
            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Select value={form.supervisorId || undefined} onValueChange={(v) => setForm({ ...form, supervisorId: v ?? "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supervisor">
                    {(() => { const s = filteredSupervisors.find((s) => s.id === form.supervisorId); return s ? `${s.firstName} ${s.lastName}` : undefined; })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredSupervisors.length === 0 ? (
                    <div className="py-2 px-3 text-xs text-muted-foreground">No supervisors in this department</div>
                  ) : (
                    filteredSupervisors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.departmentId && filteredSupervisors.length === 0 && (
                <p className="text-xs text-warning">No supervisors found in the selected department.</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="shadow-md shadow-primary/20" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
