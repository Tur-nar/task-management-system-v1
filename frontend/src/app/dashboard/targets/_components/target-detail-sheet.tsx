"use client";
import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Calendar,
  Clock,
  Loader2,
  Plus,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  targetsApi,
  type Target,
  type TargetEntry,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const statusConfig: Record<string, { label: string; style: string; icon: React.ElementType }> = {
  on_track: { label: "On Track", style: "bg-success/10 text-success border-success/20", icon: TrendingUp },
  at_risk: { label: "At Risk", style: "bg-warning/10 text-warning border-warning/20", icon: AlertTriangle },
  missed: { label: "Missed", style: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  completed: { label: "Completed", style: "bg-primary/10 text-primary dark:bg-green/10 dark:text-green border-primary/20 dark:border-green/20", icon: CheckCircle2 },
};

interface TargetDetailSheetProps {
  target: Target | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTargetUpdated: () => void;
}

export function TargetDetailSheet({ target, open, onOpenChange, onTargetUpdated }: TargetDetailSheetProps) {
  const { user } = useAuth();
  const [entries, setEntries] = React.useState<TargetEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [entryValue, setEntryValue] = React.useState("");
  const [entryNote, setEntryNote] = React.useState("");

  // Load entries when target changes
  React.useEffect(() => {
    if (target && open) {
      loadEntries(target.id);
    }
  }, [target?.id, open]);

  const loadEntries = async (targetId: string) => {
    setLoadingEntries(true);
    try {
      const res = await targetsApi.getEntries(targetId);
      setEntries(res.entries);
    } catch {
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleAddEntry = async () => {
    if (!target || !entryValue) return;
    const value = parseInt(entryValue, 10);
    if (isNaN(value) || value < 1) {
      toast.error("Please enter a valid number (minimum 1)");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Adding progress...");
    try {
      await targetsApi.addEntry(target.id, {
        value,
        ...(entryNote.trim() ? { note: entryNote.trim() } : {}),
      });
      toast.success("Progress added!", {
        id: toastId,
        description: `+${value} recorded for "${target.title}"`,
      });
      setEntryValue("");
      setEntryNote("");
      await loadEntries(target.id);
      onTargetUpdated();
    } catch (error) {
      toast.error("Failed to add progress", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!target) return;
    const toastId = toast.loading("Removing entry...");
    try {
      await targetsApi.deleteEntry(target.id, entryId);
      toast.success("Entry removed", { id: toastId });
      await loadEntries(target.id);
      onTargetUpdated();
    } catch (error) {
      toast.error("Failed to remove entry", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  };

  if (!target) return null;

  const status = statusConfig[target.status] || statusConfig.on_track;
  const StatusIcon = status.icon;
  const progress = target.targetValue > 0
    ? Math.min(Math.round((target.currentValue / target.targetValue) * 100), 100)
    : 0;

  // Deadline calculations
  const now = new Date();
  const deadline = new Date(target.deadline);
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;
  const deadlineLabel = isOverdue
    ? `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue`
    : diffDays === 0
      ? "Due today"
      : `${diffDays} day${diffDays !== 1 ? "s" : ""} left`;

  // Can the current user add entries?
  const isAssignee = target.assignee?.id === user?.id;
  const isDeptMember = target.type === "team" && user?.departmentId === target.department?.id;
  const isAdminOrSupervisor = user?.role === "super_admin" || user?.role === "admin" || user?.role === "supervisor";
  const canAddEntry = (isAssignee || isDeptMember || isAdminOrSupervisor) && target.status !== "completed" && target.status !== "missed";
  const canDeleteEntry = isAdminOrSupervisor;

  const assigneeName = target.assignee
    ? `${target.assignee.firstName} ${target.assignee.lastName}`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">
              {target.type === "team" ? (
                <><Users className="h-3 w-3 mr-1" />Team</>
              ) : (
                "Individual"
              )}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${status.style}`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <SheetTitle className="text-lg font-bold leading-snug pr-6">
            {target.title}
          </SheetTitle>
          {target.description && (
            <SheetDescription className="text-sm">
              {target.description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-6 p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm font-bold">
                {target.currentValue}
                <span className="text-muted-foreground font-normal">/{target.targetValue}</span>
                <span className="text-xs text-muted-foreground ml-1">({progress}%)</span>
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Deadline
              </div>
              <p className="text-sm font-medium">
                {deadline.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className={`text-xs font-medium ${isOverdue ? "text-destructive" : diffDays <= 3 ? "text-warning" : "text-success"}`}>
                <Clock className="h-3 w-3 inline mr-1" />
                {deadlineLabel}
              </p>
            </div>
            <div className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserIcon className="h-3.5 w-3.5" />
                {target.type === "team" ? "Department" : "Assigned To"}
              </div>
              <p className="text-sm font-medium">
                {target.type === "team"
                  ? target.department?.name || "—"
                  : assigneeName || "—"}
              </p>
              {target.type === "team" && assigneeName && (
                <p className="text-xs text-muted-foreground">{assigneeName}</p>
              )}
            </div>
          </div>

          {/* Add Entry Form */}
          {canAddEntry && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Log Progress
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-1.5">
                    <Label htmlFor="entry-value" className="text-xs">Achievement</Label>
                    <Input
                      id="entry-value"
                      type="number"
                      min="1"
                      placeholder="e.g. 5"
                      value={entryValue}
                      onChange={(e) => setEntryValue(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="entry-note" className="text-xs">Note (optional)</Label>
                    <Input
                      id="entry-note"
                      placeholder="What did you achieve?"
                      value={entryNote}
                      onChange={(e) => setEntryNote(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddEntry}
                  size="sm"
                  className="w-full shadow-md shadow-primary/20"
                  disabled={submitting || !entryValue || parseInt(entryValue) < 1}
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" />Add Entry</>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Entries Timeline */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Progress Entries
              <Badge variant="outline" className="text-[10px] ml-auto">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </Badge>
            </h4>

            {loadingEntries ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No progress entries yet
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="group relative flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    {/* Timeline dot */}
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary dark:bg-green shrink-0" />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          +{entry.value}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(entry.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          {new Date(entry.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.submitter.firstName} {entry.submitter.lastName}
                      </p>
                      {entry.note && (
                        <p className="text-xs text-foreground/80 italic">
                          &ldquo;{entry.note}&rdquo;
                        </p>
                      )}
                    </div>

                    {canDeleteEntry && (
                      <AlertDialog>
                        <AlertDialogTrigger render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                          />
                        }>
                          <Trash2 className="h-3 w-3" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove +{entry.value} from the target progress. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
