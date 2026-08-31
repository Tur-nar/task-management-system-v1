"use client";

import * as React from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { usersApi, type User } from "@/lib/api";

interface ToggleStatusDialogProps {
  user: User | null;
  onClose: () => void;
  onToggled: () => Promise<void>;
}

export function ToggleStatusDialog({ user, onClose, onToggled }: ToggleStatusDialogProps) {
  const handleToggle = async () => {
    if (!user) return;
    const toastId = toast.loading(
      user.status === "active" ? "Deactivating account..." : "Reactivating account..."
    );
    try {
      await usersApi.toggleStatus(user.id);
      const action = user.status === "active" ? "deactivated" : "reactivated";
      toast.success(`Account ${action}`, {
        id: toastId,
        description: `${user.firstName} ${user.lastName}'s account has been ${action}.`,
      });
      onClose();
      await onToggled();
    } catch (error) {
      toast.error("Failed to update status", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  };

  return (
    <AlertDialog open={!!user} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {user?.status === "active" ? "Deactivate Account" : "Reactivate Account"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user?.status === "active"
              ? `Are you sure you want to deactivate ${user?.firstName} ${user?.lastName}'s account? They will no longer be able to log in.`
              : `Reactivate ${user?.firstName} ${user?.lastName}'s account? They will be able to log in again.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={user?.status === "active"
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-success text-white hover:bg-success/90"}
            onClick={handleToggle}
          >
            {user?.status === "active" ? "Deactivate" : "Reactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
