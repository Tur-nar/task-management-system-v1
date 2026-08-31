"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { usersApi, type User, type Department } from "@/lib/api";

interface CreateStaffDialogProps {
  supervisors: User[];
  departments: Department[];
  currentUserRole?: string;
  onCreated: () => Promise<void>;
}

export function CreateStaffDialog({ supervisors, departments, currentUserRole, onCreated }: CreateStaffDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName: "", lastName: "", email: "", password: "",
    role: "staff", departmentId: "", supervisorId: "",
  });

  // Filter supervisors by selected department when role is staff
  const filteredSupervisors = form.role === "staff" && form.departmentId
    ? supervisors.filter((s: any) => s.department.id === form.departmentId)
    : supervisors;

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) return;
    setCreating(true);
    try {
      await usersApi.create({
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, password: form.password,
        role: form.role,
        departmentId: form.departmentId || undefined,
        supervisorId: form.supervisorId || undefined,
      });
      setOpen(false);
      setForm({ firstName: "", lastName: "", email: "", password: "", role: "staff", departmentId: "", supervisorId: "" });
      toast.success("Staff registered", {
        description: `${form.firstName} ${form.lastName} has been added to the system.`,
      });
      await onCreated();
    } catch (error) {
      toast.error("Failed to register staff", {
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2 shadow-md shadow-primary/20" />}>
        <Plus className="h-4 w-4" /> Register Staff
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Register New Staff</DialogTitle>
          <DialogDescription>Add a new team member to the system.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input id="first-name" placeholder="John" value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input id="last-name" placeholder="Doe" value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input id="staff-email" type="email" placeholder="admin@yourorg.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {/* <p className="text-xs text-muted-foreground">Must use @msspaceglobal.com domain</p> */}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={form.departmentId || undefined} onValueChange={(v) => setForm({ ...form, departmentId: v ?? "", supervisorId: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dept">
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
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  {currentUserRole === 'super_admin' && (
                    <SelectItem value="admin">Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.role === "staff" && (
            <div className="space-y-2">
              <Label>Assign Supervisor</Label>
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
          <div className="space-y-2">
            <Label htmlFor="staff-password">Initial Password</Label>
            <div className="relative">
              <Input id="staff-password" type={showPassword ? "text" : "password"}
                placeholder="Set a temporary password" value={form.password} className="pr-10"
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} className="shadow-md shadow-primary/20"
            disabled={creating || !form.firstName || !form.lastName || !form.email || !form.password}>
            {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : "Register Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
