"use client";

import * as React from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usersApi, type User } from "@/lib/api";

interface DeleteUserDialogProps {
  user: User | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}

export function DeleteUserDialog({ user, onClose, onDeleted }: DeleteUserDialogProps) {
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    const toastId = toast.loading("Deleting user...");
    try {
      await usersApi.delete(user.id);
      toast.success("User deleted", {
        id: toastId,
        description: `${user.firstName} ${user.lastName} has been removed.`,
      });
      onClose();
      await onDeleted();
    } catch (error) {
      toast.error("Failed to delete user", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!user} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete {user?.firstName} {user?.lastName}&apos;s account?
            This action cannot be undone. Users with active tasks cannot be deleted.
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
