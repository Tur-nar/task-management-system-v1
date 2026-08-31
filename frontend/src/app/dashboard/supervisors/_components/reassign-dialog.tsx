"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { usersApi } from "@/lib/api";
import { type SupervisorData } from "./types";

interface ReassignDialogProps {
  supervisor: SupervisorData | null;
  allSupervisors: SupervisorData[];
  onClose: () => void;
  onReassigned: () => Promise<void>;
}

export function ReassignDialog({ supervisor, allSupervisors, onClose, onReassigned }: ReassignDialogProps) {
  const [newSupervisorId, setNewSupervisorId] = React.useState("");
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<string[]>([]);
  const [reassigning, setReassigning] = React.useState(false);

  // Reset selection when supervisor changes
  React.useEffect(() => {
    if (supervisor) {
      setSelectedMemberIds(supervisor.teamMembers.map((m) => m.id));
      setNewSupervisorId("");
    }
  }, [supervisor]);

  // Filter target supervisors to same department
  const availableSupervisors = allSupervisors.filter(
    (s) => s.id !== supervisor?.id && s.departmentId === supervisor?.departmentId
  );

  const allSelected = supervisor
    ? selectedMemberIds.length === supervisor.teamMembers.length
    : false;

  const toggleAll = () => {
    if (!supervisor) return;
    if (allSelected) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(supervisor.teamMembers.map((m) => m.id));
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleReassign = async () => {
    if (!supervisor || !newSupervisorId || selectedMemberIds.length === 0) return;
    setReassigning(true);
    const toastId = toast.loading("Reassigning members...");
    try {
      // If all selected, don't send memberIds (bulk)
      const memberIds = selectedMemberIds.length === supervisor.teamMembers.length
        ? undefined : selectedMemberIds;
      const res = await usersApi.reassignTeam(supervisor.id, newSupervisorId, memberIds);
      toast.success("Members reassigned", {
        id: toastId,
        description: res.message,
      });
      onClose();
      await onReassigned();
    } catch (error) {
      toast.error("Failed to reassign", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setReassigning(false);
    }
  };

  return (
    <Dialog open={!!supervisor} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Reassign Team Members</DialogTitle>
          <DialogDescription>
            Select members from <strong>{supervisor?.name}</strong>&apos;s team to reassign to a new supervisor in the same department.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Current supervisor */}
          <div className="space-y-2">
            <Label>Current Supervisor</Label>
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm font-bold bg-green/10 text-green">
                  {supervisor?.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{supervisor?.name}</p>
                <p className="text-xs text-muted-foreground">{supervisor?.department} • {supervisor?.teamSize} members</p>
              </div>
            </div>
          </div>

          {/* Member selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Members to Reassign</Label>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={toggleAll}>
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border p-2">
              {supervisor?.teamMembers.map((member) => (
                <label key={member.id}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer transition-colors">
                  <Checkbox
                    checked={selectedMemberIds.includes(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                  />
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
                      {member.name.split(" ").map((n) => n.charAt(0)).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedMemberIds.length} of {supervisor?.teamMembers.length} member{(supervisor?.teamMembers.length || 0) !== 1 ? "s" : ""} selected
            </p>
          </div>

          {/* New supervisor selection */}
          <div className="space-y-2">
            <Label>New Supervisor (same department)</Label>
            <Select value={newSupervisorId || undefined} onValueChange={(v) => setNewSupervisorId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select new supervisor">
                  {(() => { const s = availableSupervisors.find((s) => s.id === newSupervisorId); return s ? `${s.name} (${s.teamSize} members)` : undefined; })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableSupervisors.length === 0 ? (
                  <div className="py-2 px-3 text-xs text-muted-foreground">
                    No other supervisors in this department
                  </div>
                ) : (
                  availableSupervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.teamSize} members)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {availableSupervisors.length === 0 && (
              <p className="text-xs text-warning">No other supervisors found in {supervisor?.department}.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReassign}
            disabled={reassigning || !newSupervisorId || selectedMemberIds.length === 0}
            className="gap-2 shadow-md shadow-primary/20">
            {reassigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Reassign ({selectedMemberIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
