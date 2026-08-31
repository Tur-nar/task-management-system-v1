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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Loader2, X, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { tasksApi, subTasksApi, type Task, type User, type Department } from "@/lib/api";

interface CreateTaskDialogProps {
  users: User[];
  departments: Department[];
  currentUserRole: string;
  onCreated: () => Promise<void>;
}

export function CreateTaskDialog({ users, departments, currentUserRole, onCreated }: CreateTaskDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "", description: "", assignedToId: "",
    priority: "medium", departmentId: "", deadline: "",
  });

  // Sub-tasks draft list (local only until task is created)
  const [subtaskDrafts, setSubtaskDrafts] = React.useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = React.useState("");

  const addSubtaskDraft = () => {
    const trimmed = subtaskInput.trim();
    if (!trimmed) return;
    setSubtaskDrafts((prev) => [...prev, trimmed]);
    setSubtaskInput("");
  };

  const removeSubtaskDraft = (idx: number) => {
    setSubtaskDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setForm({ title: "", description: "", assignedToId: "", priority: "medium", departmentId: "", deadline: "" });
    setSubtaskDrafts([]);
    setSubtaskInput("");
  };

  const handleCreate = async () => {
    if (!form.title || !form.deadline || !form.assignedToId) return;
    setCreating(true);
    try {
      const res = await tasksApi.create({
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        deadline: form.deadline,
        assignedToId: form.assignedToId,
        departmentId: form.departmentId || undefined,
      });

      // Create any sub-task drafts sequentially
      if (subtaskDrafts.length > 0) {
        const taskId = (res as unknown as { task: Task }).task.id;
        for (const title of subtaskDrafts) {
          await subTasksApi.create(taskId, title);
        }
      }

      setOpen(false);
      resetForm();
      toast.success("Task created", { description: `"${form.title}" has been assigned.` });
      await onCreated();
    } catch (error) {
      toast.error("Failed to create task", {
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger render={<Button className="gap-2 shadow-md shadow-primary/20" />}>
        <Plus className="h-4 w-4" />
        New Task
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Fill in the details to create a new task for your team.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input id="task-title" placeholder="Enter task title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" placeholder="Describe the task in detail..." rows={3}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Assign + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={form.assignedToId || undefined} onValueChange={(v) => {
                const selectedUser = users.find((u) => u.id === v);
                setForm({ ...form, assignedToId: v ?? "", departmentId: selectedUser?.departmentId || form.departmentId });
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

          {/* Department + Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select disabled value={form.departmentId || undefined}
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
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" value={form.deadline}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>

          {/* Sub-tasks section */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Sub-tasks <span className="text-muted-foreground font-normal">(optional)</span></Label>
            </div>

            {subtaskDrafts.length > 0 && (
              <ul className="space-y-1">
                {subtaskDrafts.map((title, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm bg-muted/40 rounded-md px-3 py-1.5">
                    <div className="h-3.5 w-3.5 rounded border border-muted-foreground/40 shrink-0" />
                    <span className="flex-1">{title}</span>
                    <button type="button" onClick={() => removeSubtaskDraft(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Add a sub-task..."
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtaskDraft(); } }}
                className="h-9 text-sm"
              />
              <Button type="button" variant="outline" size="sm" onClick={addSubtaskDraft}
                disabled={!subtaskInput.trim()} className="h-9 gap-1.5 shrink-0">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
          <Button onClick={handleCreate} className="shadow-md shadow-primary/20"
            disabled={creating || !form.title || !form.deadline || !form.assignedToId}>
            {creating ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</>) : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
