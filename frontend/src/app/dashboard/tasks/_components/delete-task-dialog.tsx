"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { tasksApi, type Task } from "@/lib/api";

interface DeleteTaskDialogProps {
  task: Task | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}

export function DeleteTaskDialog({ task, onClose, onDeleted }: DeleteTaskDialogProps) {
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!task) return;
    setDeleting(true);
    const toastId = toast.loading("Deleting task...");
    try {
      await tasksApi.delete(task.id);
      toast.success("Task deleted", {
        id: toastId,
        description: `"${task.title}" has been removed.`,
      });
      onClose();
      await onDeleted();
    } catch (error) {
      toast.error("Failed to delete task", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!task} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Task</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{task?.title}&rdquo;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
