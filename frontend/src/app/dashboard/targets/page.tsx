"use client";
import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Target,
  TrendingUp,
  Calendar,
  Users,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pencil,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { targetsApi, departmentsApi, usersApi, type Target as TargetType, type Department, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { TargetDetailSheet } from "./_components/target-detail-sheet";

const statusConfig: Record<string, { label: string; style: string }> = {
  on_track: { label: "On Track", style: "bg-success/10 text-success border-success/20" },
  at_risk: { label: "At Risk", style: "bg-warning/10 text-warning border-warning/20" },
  missed: { label: "Missed", style: "bg-destructive/10 text-destructive border-destructive/20" },
  completed: { label: "Completed", style: "bg-primary/10 text-primary dark:bg-green/10 dark:text-green border-primary/20 dark:border-green/20" },
};

type FilterTab = "all" | "on_track" | "at_risk" | "missed" | "completed";

export default function TargetsPage() {
  const { user } = useAuth();
  const [targets, setTargets] = React.useState<TargetType[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [staff, setStaff] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all");

  // Detail sheet state
  const [selectedTarget, setSelectedTarget] = React.useState<TargetType | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingTarget, setEditingTarget] = React.useState<TargetType | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    title: "",
    type: "team",
    description: "",
    departmentId: "",
    assignedToId: "",
    targetValue: "",
    deadline: "",
  });

  const [form, setForm] = React.useState({
    title: "",
    type: "team",
    departmentId: "",
    assignedToId: "",
    targetValue: "",
    deadline: "",
  });

  React.useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [targetsRes, deptRes] = await Promise.all([
        targetsApi.getAll(),
        departmentsApi.getAll(),
      ]);
      setTargets(targetsRes.targets);
      setDepartments(deptRes.departments);

      if (user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'supervisor') {
        try {
          const usersRes = await usersApi.getAll({ status: 'active' });
          setStaff(usersRes.users);
        } catch { /* ignore */ }
      }
    } catch (error) {
      console.error("Failed to load targets:", error);
      toast.error("Failed to load targets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.targetValue || !form.deadline) return;
    setCreating(true);
    try {
      await targetsApi.create({
        title: form.title,
        type: form.type as 'individual' | 'team',
        targetValue: parseInt(form.targetValue),
        deadline: form.deadline,
        ...(form.departmentId && { departmentId: form.departmentId }),
        ...(form.assignedToId && { assignedToId: form.assignedToId }),
      } as Partial<TargetType>);
      setDialogOpen(false);
      setForm({ title: "", type: "team", departmentId: "", assignedToId: "", targetValue: "", deadline: "" });
      toast.success("Target created", { description: `"${form.title}" has been set.` });
      await loadData();
    } catch (error) {
      toast.error("Failed to create target", {
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (target: TargetType) => {
    setEditingTarget(target);
    setEditForm({
      title: target.title,
      type: target.type,
      description: target.description || "",
      departmentId: (target.department?.id) || "",
      assignedToId: (target.assignee?.id) || "",
      targetValue: String(target.targetValue),
      deadline: target.deadline ? new Date(target.deadline).toISOString().split("T")[0] : "",
    });
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editingTarget || !editForm.title || !editForm.targetValue || !editForm.deadline) return;
    setSaving(true);
    const toastId = toast.loading("Saving changes...");
    try {
      await targetsApi.update(editingTarget.id, {
        title: editForm.title,
        type: editForm.type as 'individual' | 'team',
        description: editForm.description || undefined,
        targetValue: parseInt(editForm.targetValue),
        deadline: editForm.deadline,
        ...(editForm.departmentId ? { departmentId: editForm.departmentId } : { departmentId: undefined }),
        ...(editForm.type === 'individual' && editForm.assignedToId
          ? { assignedToId: editForm.assignedToId }
          : { assignedToId: undefined }),
      } as Partial<TargetType>);
      toast.success("Target updated", { id: toastId, description: `"${editForm.title}" saved.` });
      setEditDialogOpen(false);
      setEditingTarget(null);
      await loadData();
    } catch (error) {
      toast.error("Failed to update target", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (target: TargetType) => {
    setSelectedTarget(target);
    setSheetOpen(true);
  };

  const summary = {
    total: targets.length,
    completed: targets.filter((t) => t.status === "completed").length,
    onTrack: targets.filter((t) => t.status === "on_track").length,
    atRisk: targets.filter((t) => t.status === "at_risk").length,
    missed: targets.filter((t) => t.status === "missed").length,
  };

  const filteredTargets = activeFilter === "all"
    ? targets
    : targets.filter((t) => t.status === activeFilter);

  const canCreate = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'supervisor';
  const canEdit = canCreate;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Targets</h2>
          <p className="text-muted-foreground mt-1">
            Set and track team and individual performance targets
          </p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button className="gap-2 shadow-md shadow-primary/20" />}>
              <Plus className="h-4 w-4" />
              Set Target
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Target</DialogTitle>
                <DialogDescription>
                  Set a performance target for a team or individual.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="target-title">Target Title</Label>
                  <Input
                    id="target-title"
                    placeholder="e.g., Complete 50 client meetings"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "team" })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team">Team Target</SelectItem>
                        <SelectItem value="individual">Individual Target</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={form.departmentId || undefined} onValueChange={(v) => setForm({ ...form, departmentId: v ?? "" })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dept">
                          {departments.find((d) => d.id === form.departmentId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.type === "individual" && (
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select value={form.assignedToId || undefined} onValueChange={(v) => setForm({ ...form, assignedToId: v ?? "" })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member">
                          {(() => { const s = staff.find((s) => s.id === form.assignedToId); return s ? `${s.firstName} ${s.lastName}` : undefined; })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {staff.filter(s => s.role !== 'super_admin').map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal">Goal (numeric)</Label>
                    <Input
                      id="goal"
                      type="number"
                      placeholder="50"
                      value={form.targetValue}
                      onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-deadline">Deadline</Label>
                    <Input
                      id="target-deadline"
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  className="shadow-md shadow-primary/20"
                  disabled={creating || !form.title || !form.targetValue || !form.deadline}
                >
                  {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</> : "Create Target"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Total Targets", value: summary.total, icon: Target, color: "text-primary dark:text-green", bg: "bg-primary/10 dark:bg-green/10" },
          { label: "Completed", value: summary.completed, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
          { label: "On Track", value: summary.onTrack, icon: TrendingUp, color: "text-primary dark:text-green", bg: "bg-primary/10 dark:bg-green/10" },
          { label: "At Risk", value: summary.atRisk, icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
          { label: "Missed", value: summary.missed, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`rounded-xl p-2.5 ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {([
          { key: "all", label: "All", count: targets.length },
          { key: "on_track", label: "On Track", count: summary.onTrack },
          { key: "at_risk", label: "At Risk", count: summary.atRisk },
          { key: "missed", label: "Missed", count: summary.missed },
          { key: "completed", label: "Completed", count: summary.completed },
        ] as { key: FilterTab; label: string; count: number }[]).map((tab) => (
          <Button
            key={tab.key}
            variant={activeFilter === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(tab.key)}
            className="gap-1.5 shrink-0"
          >
            {tab.label}
            <Badge
              variant="outline"
              className={`text-[10px] ml-1 ${activeFilter === tab.key ? "bg-background/20 text-primary-foreground border-primary-foreground/30" : ""}`}
            >
              {tab.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Target Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTargets.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center text-muted-foreground">
              {activeFilter === "all"
                ? "No targets set yet. Create your first target to start tracking!"
                : `No ${activeFilter.replace("_", " ")} targets.`}
            </CardContent>
          </Card>
        ) : (
          filteredTargets.map((target) => {
            const status = statusConfig[target.status] || statusConfig.on_track;
            const progress = target.targetValue > 0
              ? Math.min(Math.round((target.currentValue / target.targetValue) * 100), 100)
              : 0;
            const assigneeName = target.assignee
              ? `${target.assignee.firstName} ${target.assignee.lastName}`
              : null;

            // Deadline countdown
            const now = new Date();
            const deadline = new Date(target.deadline);
            const diffMs = deadline.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const isOverdue = diffDays < 0;

            return (
              <Card
                key={target.id}
                className={`group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${
                  target.status === "missed" ? "border-destructive/30" : ""
                }`}
                onClick={() => openDetail(target)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold leading-snug">
                        {target.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {target.type === "team" ? (
                            <><Users className="h-3 w-3 mr-1" />Team</>
                          ) : (
                            "Individual"
                          )}
                        </Badge>
                        {target.department && (
                          <span className="text-xs">{target.department.name}</span>
                        )}
                        {assigneeName && (
                          <span className="text-xs">• {assigneeName}</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${status.style}`}>
                        {status.label}
                      </Badge>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e: React.MouseEvent) => e.stopPropagation()} />
                          }>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              openEditDialog(target);
                            }}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Edit Target
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">
                      {target.currentValue}/{target.targetValue}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({progress}%)
                      </span>
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due{" "}
                      {deadline.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className={`flex items-center gap-1 font-medium ${
                      isOverdue || target.status === "missed"
                        ? "text-destructive"
                        : diffDays <= 3
                          ? "text-warning"
                          : "text-success"
                    }`}>
                      <Clock className="h-3 w-3" />
                      {isOverdue
                        ? `${Math.abs(diffDays)}d overdue`
                        : diffDays === 0
                          ? "Due today"
                          : `${diffDays}d left`}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Target Detail Sheet */}
      <TargetDetailSheet
        target={selectedTarget}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedTarget(null);
        }}
        onTargetUpdated={loadData}
      />

      {/* Edit Target Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingTarget(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Target</DialogTitle>
            <DialogDescription>
              Update the details for this target.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-target-title">Target Title</Label>
              <Input
                id="edit-target-title"
                placeholder="e.g., Complete 50 client meetings"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-target-description">Description</Label>
              <Textarea
                id="edit-target-description"
                placeholder="Describe this target..."
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={(v) => setEditForm({ ...editForm, type: v ?? "team" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team Target</SelectItem>
                    <SelectItem value="individual">Individual Target</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={editForm.departmentId || undefined} onValueChange={(v) => setEditForm({ ...editForm, departmentId: v ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dept">
                      {departments.find((d) => d.id === editForm.departmentId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editForm.type === "individual" && (
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={editForm.assignedToId || undefined} onValueChange={(v) => setEditForm({ ...editForm, assignedToId: v ?? "" })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member">
                      {(() => { const s = staff.find((s) => s.id === editForm.assignedToId); return s ? `${s.firstName} ${s.lastName}` : undefined; })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {staff.filter(s => s.role !== 'super_admin').map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-goal">Goal (numeric)</Label>
                <Input
                  id="edit-goal"
                  type="number"
                  placeholder="50"
                  value={editForm.targetValue}
                  onChange={(e) => setEditForm({ ...editForm, targetValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-target-deadline">Deadline</Label>
                <Input
                  id="edit-target-deadline"
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditingTarget(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              className="shadow-md shadow-primary/20"
              disabled={saving || !editForm.title || !editForm.targetValue || !editForm.deadline}
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
