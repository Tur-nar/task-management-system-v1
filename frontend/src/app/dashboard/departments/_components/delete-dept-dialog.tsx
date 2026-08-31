"use client";

import * as React from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { departmentsApi, type Department } from "@/lib/api";

interface DeleteDeptDialogProps {
  department: Department | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}

export function DeleteDeptDialog({ department, onClose, onDeleted }: DeleteDeptDialogProps) {
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!department) return;
    setDeleting(true);
    const toastId = toast.loading("Deleting department...");
    try {
      await departmentsApi.delete(department.id);
      toast.success("Department deleted", {
        id: toastId,
        description: `"${department.name}" has been removed.`,
      });
      onClose();
      await onDeleted();
    } catch (error) {
      toast.error("Failed to delete", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!department} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Department</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{department?.name}&rdquo;? Staff must be reassigned first. This cannot be undone.
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
