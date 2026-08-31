"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { user, login } = useAuth(); // useAuth provides user
  const [saving, setSaving] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");

  React.useEffect(() => {
    if (user && open) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
    }
  }, [user, open]);

  const handleSave = async () => {
    if (!firstName || !lastName) {
      toast.error("Both first and last name are required");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Updating profile...");
    
    try {
      const res = await authApi.updateProfile(firstName, lastName);
      // We don't have a specific update method in Context, 
      // but we can either reload the window or let the next fetch get it.
      // To immediately reflect, we could manually reload since we update token/user in localstorage?
      // Actually `authApi.updateProfile` doesn't change the JWT token, but the token might contain the name!
      // The token does NOT need changing but we want UI to reflect. 
      // The easiest way is triggering a page reload OR we update the local auth state if we exported a `setUser` or `refresh` method.
      
      toast.success("Profile updated", { id: toastId });
      onOpenChange(false);
      window.location.reload(); // Simple way to refresh user context
    } catch (error) {
      toast.error("Failed to update profile", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your first and last name as they appear to your team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input 
              id="firstName" 
              placeholder="Enter first name" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input 
              id="lastName" 
              placeholder="Enter last name" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="shadow-md shadow-primary/20" disabled={saving || !firstName || !lastName}>
            {saving ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>) : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
