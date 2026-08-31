"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { tasksApi, type Task, type User, type Department } from "@/lib/api";

interface EditTaskDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  departments: Department[];
  currentUserRole: string;
  onUpdated: () => Promise<void>;
}

export function EditTaskDialog({ task, open, onOpenChange, users, departments, currentUserRole, onUpdated }: EditTaskDialogProps) {
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "", description: "", assignedToId: "",
    priority: "medium", departmentId: "", deadline: "",
  });

  React.useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || "",
        assignedToId: task.assignedToId || "",
        priority: task.priority,
        departmentId: task.departmentId || "",
        deadline: task.deadline ? new Date(task.deadline).toISOString().split("T")[0] : "",
      });
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    const toastId = toast.loading("Saving changes...");
    try {
      await tasksApi.update(task.id, {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority as Task["priority"],
        deadline: form.deadline,
        assignedToId: form.assignedToId,
        departmentId: form.departmentId || undefined,
      } as Partial<Task>);
      toast.success("Task updated", { id: toastId, description: `"${form.title}" saved.` });
      onOpenChange(false);
      await onUpdated();
    } catch (error) {
      toast.error("Failed to update task", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update task details, reassign, or change priority.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Task Title</Label>
            <Input id="edit-title" placeholder="Enter task title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" placeholder="Describe the task..." rows={3}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={form.assignedToId || undefined} onValueChange={(v) => {
                const selectedUser = users.find((u) => u.id === v);
                setForm({
                  ...form,
                  assignedToId: v ?? "",
                  departmentId: selectedUser?.departmentId || form.departmentId,
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff">
                    {(() => { const u = users.find((u) => u.id === form.assignedToId); return u ? `${u.firstName} ${u.lastName}` : undefined; })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.filter((u) => u.role !== "super_admin").map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v ?? "medium" })}>
                <SelectTrigger><SelectValue placeholder="Set priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select disabled={currentUserRole !== "super_admin" && currentUserRole !== "admin"}
                value={form.departmentId || undefined}
                onValueChange={(v) => setForm({ ...form, departmentId: v ?? "" })}>
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
              <Label htmlFor="edit-deadline">Deadline</Label>
              <Input id="edit-deadline" type="date" value={form.deadline}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="shadow-md shadow-primary/20"
            disabled={saving || !form.title || !form.deadline || !form.assignedToId}>
            {saving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>) : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
