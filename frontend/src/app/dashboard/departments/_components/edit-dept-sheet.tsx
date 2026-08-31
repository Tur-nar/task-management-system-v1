"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { departmentsApi, type Department, type User } from "@/lib/api";

interface EditDeptSheetProps {
  department: Department | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supervisors: User[];
  onUpdated: () => Promise<void>;
}

export function EditDeptSheet({ department, open, onOpenChange, supervisors, onUpdated }: EditDeptSheetProps) {
  const [updating, setUpdating] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", description: "", headId: "" });

  React.useEffect(() => {
    if (department) {
      setForm({
        name: department.name,
        description: department.description || "",
        headId: department.headId || "",
      });
    }
  }, [department]);

  // Filter supervisors to only ones in this department
  const deptSupervisors = department
    ? supervisors.filter((s) => s.departmentId === department.id)
    : supervisors;

  // Fallback: if no supervisors in dept yet, show all
  const availableSupervisors = deptSupervisors.length > 0 ? deptSupervisors : supervisors;

  const handleUpdate = async () => {
    if (!department || !form.name) return;
    setUpdating(true);
    try {
      await departmentsApi.update(department.id, {
        name: form.name,
        description: form.description || undefined,
        headId: form.headId || null,
      } as Partial<Department>);
      toast.success("Department updated", { description: `"${form.name}" has been saved.` });
      onOpenChange(false);
      await onUpdated();
    } catch (error) {
      toast.error("Failed to update", {
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Department</SheetTitle>
          <SheetDescription>Update department details and head assignment.</SheetDescription>
        </SheetHeader>
        <div className="px-4 space-y-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Department Name</Label>
            <Input id="edit-name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Department Head (Supervisor in dept.)</Label>
            <Select value={form.headId || undefined} onValueChange={(v) => setForm({ ...form, headId: v ?? "" })}>
              <SelectTrigger>
                <SelectValue placeholder="Select head">
                  {(() => { const s = availableSupervisors.find((s) => s.id === form.headId); return s ? `${s.firstName} ${s.lastName}` : undefined; })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableSupervisors.length === 0 ? (
                  <div className="py-2 px-3 text-xs text-muted-foreground">No supervisors available</div>
                ) : (
                  availableSupervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {deptSupervisors.length === 0 && supervisors.length > 0 && (
              <p className="text-xs text-muted-foreground">Showing all supervisors — none assigned to this department yet.</p>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1 shadow-md shadow-primary/20" onClick={handleUpdate}
              disabled={updating || !form.name}>
              {updating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
