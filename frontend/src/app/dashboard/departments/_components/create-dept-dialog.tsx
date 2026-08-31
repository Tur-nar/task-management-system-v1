"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { departmentsApi, type User } from "@/lib/api";

interface CreateDeptDialogProps {
  supervisors: User[];
  onCreated: () => Promise<void>;
}

export function CreateDeptDialog({ supervisors, onCreated }: CreateDeptDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", description: "", headId: "" });

  const handleCreate = async () => {
    if (!form.name) return;
    setCreating(true);
    try {
      await departmentsApi.create({
        name: form.name,
        description: form.description || undefined,
        headId: form.headId || undefined,
      });
      setOpen(false);
      setForm({ name: "", description: "", headId: "" });
      toast.success("Department created", { description: `"${form.name}" has been added.` });
      await onCreated();
    } catch (error) {
      toast.error("Failed to create department", {
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2 shadow-md shadow-primary/20" />}>
        <Plus className="h-4 w-4" /> Add Department
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
          <DialogDescription>Add a new department or unit to the organization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dept-name">Department Name</Label>
            <Input id="dept-name" placeholder="e.g., Product Design" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept-description">Description</Label>
            <Textarea id="dept-description" placeholder="Brief description of the department..." rows={3}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Department Head (Supervisor)</Label>
            <Select value={form.headId || undefined} onValueChange={(v) => setForm({ ...form, headId: v ?? "" })}>
              <SelectTrigger>
                <SelectValue placeholder="Select department head">
                  {(() => { const s = supervisors.find((s) => s.id === form.headId); return s ? `${s.firstName} ${s.lastName}` : undefined; })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {supervisors.length === 0 ? (
                  <div className="py-2 px-3 text-xs text-muted-foreground">No supervisors available</div>
                ) : (
                  supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} className="shadow-md shadow-primary/20" disabled={creating || !form.name}>
            {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : "Create Department"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
