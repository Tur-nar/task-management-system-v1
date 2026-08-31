"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquareWarning, Plus, Search, Filter, AlertCircle,
  CheckCircle2, Clock, XCircle, MoreHorizontal, Eye, Trash2,
  Bug, MessageCircle, Lightbulb, AlertTriangle, HelpCircle,
  Loader2, X, Users, ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  complaintsApi, usersApi,
  type Complaint, type ComplaintStats, type User,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const categoryIcons: Record<string, React.ReactNode> = {
  bug: <Bug className="h-4 w-4" />,
  complaint: <MessageCircle className="h-4 w-4" />,
  suggestion: <Lightbulb className="h-4 w-4" />,
  error: <AlertTriangle className="h-4 w-4" />,
  other: <HelpCircle className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  bug: "bg-destructive/10 text-destructive border-destructive/20",
  complaint: "bg-warning/10 text-warning border-warning/20",
  suggestion: "bg-primary/10 text-primary dark:bg-green/10 dark:text-green border-primary/20 dark:border-green/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  other: "bg-muted text-muted-foreground border-border",
};

const statusColors: Record<string, string> = {
  open: "bg-primary/10 text-primary dark:bg-green/10 dark:text-green border-primary/20 dark:border-green/20",
  in_review: "bg-warning/10 text-warning border-warning/20",
  resolved: "bg-success/10 text-success border-success/20",
  dismissed: "bg-muted text-muted-foreground border-border",
  overlooked: "bg-destructive/10 text-destructive border-destructive/20",
};

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
};

function ComplaintCountdown({ createdAt, status }: { createdAt: string | Date; status: string }) {
  const isActive = status === "open" || status === "in_review";

  // Compute initial state synchronously to avoid a blank flash
  const computeLabel = React.useCallback(() => {
    const diff = new Date(createdAt).getTime() + 7_200_000 - Date.now();
    if (diff <= 0) return "expired";
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  }, [createdAt]);

  const [label, setLabel] = React.useState(() => (isActive ? computeLabel() : ""));
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    // Clean up any old interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isActive) {
      setLabel("");
      return;
    }

    // If already expired, set once and don't start an interval at all
    const initial = computeLabel();
    setLabel(initial);
    if (initial === "expired") return;

    intervalRef.current = setInterval(() => {
      const next = computeLabel();
      setLabel(next);
      // Stop the interval the instant it expires — no more re-renders
      if (next === "expired" && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [createdAt, isActive, computeLabel]);

  if (!isActive) return null;

  const isExpired = label === "expired";

  return (
    <div className="flex items-center gap-1 text-[11px] font-medium shrink-0 mt-1">
      <Clock className={`h-3.5 w-3.5 ${isExpired ? "text-destructive" : "text-muted-foreground"}`} />
      <span className={isExpired ? "text-destructive font-semibold" : "text-muted-foreground"}>
        {isExpired ? "Overlooked" : `Due in: ${label}`}
      </span>
    </div>
  );
}

export default function ComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = React.useState<Complaint[]>([]);
  const [stats, setStats] = React.useState<ComplaintStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  // Create dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "", description: "", category: "complaint", priority: "medium",
  });

  // Target user picker
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [selectedTargets, setSelectedTargets] = React.useState<string[]>([]);
  const [targetSearch, setTargetSearch] = React.useState("");
  const [targetPickerOpen, setTargetPickerOpen] = React.useState(false);

  // Detail sheet
  const [selected, setSelected] = React.useState<Complaint | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Status update dialog
  const [statusTarget, setStatusTarget] = React.useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = React.useState("");
  const [resolution, setResolution] = React.useState("");
  const [updatingStatus, setUpdatingStatus] = React.useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<Complaint | null>(null);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  React.useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [complaintsRes, statsRes, usersRes] = await Promise.all([
        complaintsApi.getAll(),
        complaintsApi.getStats(),
        usersApi.getAll({ status: "active" }),
      ]);
      setComplaints(complaintsRes.complaints);
      setStats(statsRes.stats);
      setAllUsers(usersRes.users);
    } catch {
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  // Filter users for the target picker (exclude self, apply search)
  const filteredPickerUsers = allUsers.filter((u) => {
    if (u.id === user?.id) return false;
    if (!targetSearch) return true;
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return fullName.includes(targetSearch.toLowerCase()) || u.email.toLowerCase().includes(targetSearch.toLowerCase());
  });

  const toggleTarget = (userId: string) => {
    setSelectedTargets((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    const toastId = toast.loading("Submitting complaint...");
    setCreating(true);
    try {
      await complaintsApi.create({
        ...form,
        ...(selectedTargets.length > 0 ? { targetUserIds: selectedTargets } : {}),
      });
      toast.success("Complaint submitted", { id: toastId, description: "Your complaint has been logged." });
      setCreateOpen(false);
      setForm({ title: "", description: "", category: "complaint", priority: "medium" });
      setSelectedTargets([]);
      setTargetSearch("");
      await loadData();
    } catch (error) {
      toast.error("Failed to submit complaint", {
        id: toastId, description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusTarget || !newStatus) return;
    const toastId = toast.loading("Updating status...");
    setUpdatingStatus(true);
    try {
      await complaintsApi.updateStatus(statusTarget.id, newStatus, resolution || undefined);
      toast.success("Status updated", { id: toastId });
      setStatusTarget(null);
      setNewStatus("");
      setResolution("");
      await loadData();
    } catch (error) {
      toast.error("Failed to update status", {
        id: toastId, description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const toastId = toast.loading("Deleting complaint...");
    try {
      await complaintsApi.delete(deleteTarget.id);
      toast.success("Complaint deleted", { id: toastId });
      setDeleteTarget(null);
      if (sheetOpen && selected?.id === deleteTarget.id) {
        setSheetOpen(false);
        setSelected(null);
      }
      await loadData();
    } catch (error) {
      toast.error("Failed to delete", {
        id: toastId, description: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  };

  const filtered = complaints.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesCat = categoryFilter === "all" || c.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCat;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Complaints & Issues</h2>
            <p className="text-muted-foreground mt-1">
              Log and track bugs, complaints, suggestions, and errors
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button className="gap-2" />}>
              <Plus className="h-4 w-4" /> Submit Complaint
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Submit a Complaint or Issue</DialogTitle>
                <DialogDescription>
                  Describe the issue you&apos;re experiencing. This will be sent to management for review.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="Brief summary of the issue" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the issue in detail..." rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? "complaint" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bug">Bug</SelectItem>
                        <SelectItem value="complaint">Complaint</SelectItem>
                        <SelectItem value="suggestion">Suggestion</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v ?? "medium" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Target user picker */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Direct to (optional)
                  </Label>
                  <Popover open={targetPickerOpen} onOpenChange={setTargetPickerOpen}>
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      }
                    >
                      <span className="text-muted-foreground truncate">
                        {selectedTargets.length === 0
                          ? "Select users to direct this to…"
                          : `${selectedTargets.length} user${selectedTargets.length > 1 ? "s" : ""} selected`}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[calc(var(--popover-trigger-width))] p-0" align="start">
                      <div className="p-2 border-b border-border">
                        <Input
                          placeholder="Search users..."
                          className="h-8"
                          value={targetSearch}
                          onChange={(e) => setTargetSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {filteredPickerUsers.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
                        ) : (
                          filteredPickerUsers.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                              onClick={() => toggleTarget(u.id)}
                            >
                              <Checkbox checked={selectedTargets.includes(u.id)} />
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
                                  {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{u.firstName} {u.lastName}</span>
                              <span className="ml-auto text-xs text-muted-foreground truncate">{u.role.replace("_", " ")}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {selectedTargets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedTargets.map((id) => {
                        const u = allUsers.find((x) => x.id === id);
                        if (!u) return null;
                        return (
                          <Badge key={id} variant="outline" className="gap-1 pr-1 text-xs">
                            {u.firstName} {u.lastName}
                            <button
                              type="button"
                              className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                              onClick={() => toggleTarget(id)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</> : "Submit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
          {[
            { label: "Total", value: stats?.total ?? 0, icon: MessageSquareWarning, color: "text-primary dark:text-green", bg: "bg-primary/10 dark:bg-green/10" },
            { label: "Open", value: stats?.open ?? 0, icon: AlertCircle, color: "text-primary dark:text-green", bg: "bg-primary/10 dark:bg-green/10" },
            { label: "In Review", value: stats?.inReview ?? 0, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
            { label: "Overlooked", value: stats?.overlooked ?? 0, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
            { label: "Resolved", value: stats?.resolved ?? 0, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
            { label: "Dismissed", value: stats?.dismissed ?? 0, icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-5 flex flex-col xl:flex-row xl:items-center items-start gap-4">
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search complaints..." className="pl-9 h-10" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-[140px] h-10">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="overlooked">Overlooked</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
            <SelectTrigger className="w-[140px] h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="complaint">Complaint</SelectItem>
              <SelectItem value="suggestion">Suggestion</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Complaints List */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquareWarning className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {complaints.length === 0 ? "No complaints yet. Submit one using the button above." : "No complaints match your filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((complaint) => {
              const submitter = complaint.submitter;
              const initials = submitter ? `${submitter.firstName.charAt(0)}${submitter.lastName.charAt(0)}` : "??";
              const name = submitter ? `${submitter.firstName} ${submitter.lastName}` : "Unknown";
              const canDelete = isAdmin || (complaint.userId === user?.id && complaint.status === "open");

              return (
                <Card key={complaint.id}
                  className="group hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => { setSelected(complaint); setSheetOpen(true); }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{complaint.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {name} · {new Date(complaint.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Badge variant="outline" className={`text-[10px] gap-1 ${categoryColors[complaint.category]}`}>
                              {categoryIcons[complaint.category]}
                              {complaint.category}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${priorityColors[complaint.priority]}`}>
                              {complaint.priority}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${statusColors[complaint.status]}`}>
                              {complaint.status.replace("_", " ")}
                            </Badge>
                            {(isAdmin || canDelete) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger render={
                                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" />
                                }>
                                  <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setSelected(complaint); setSheetOpen(true); }}>
                                    <Eye className="h-4 w-4 mr-2" /> View Details
                                  </DropdownMenuItem>
                                  {isAdmin && complaint.status !== "resolved" && complaint.status !== "dismissed" && (
                                    <DropdownMenuItem onClick={() => { setStatusTarget(complaint); setNewStatus(""); }}>
                                      <CheckCircle2 className="h-4 w-4 mr-2" /> Update Status
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete && (
                                    <DropdownMenuItem className="text-destructive"
                                      onClick={() => setDeleteTarget(complaint)}>
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {complaint.description}
                        </p>
                        <ComplaintCountdown createdAt={complaint.createdAt} status={complaint.status} />
                        {(complaint.targets?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-[10px] text-muted-foreground font-medium">Directed to:</span>
                            <div className="flex -space-x-1.5">
                              {complaint.targets!.slice(0, 4).map((t) => (
                                <Avatar key={t.id} className="h-5 w-5 border-2 border-background">
                                  <AvatarFallback className="text-[8px] font-semibold bg-destructive/10 text-destructive">
                                    {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            {complaint.targets!.length <= 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                {complaint.targets!.map((t) => `${t.firstName} ${t.lastName}`).join(", ")}
                              </span>
                            )}
                            {complaint.targets!.length > 4 && (
                              <span className="text-[10px] text-muted-foreground">+{complaint.targets!.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">{selected.title}</SheetTitle>
                <SheetDescription className="text-left">
                  Submitted {new Date(selected.createdAt).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                  })}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 space-y-6 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`gap-1 ${categoryColors[selected.category]}`}>
                    {categoryIcons[selected.category]}
                    {selected.category}
                  </Badge>
                  <Badge variant="outline" className={priorityColors[selected.priority]}>
                    {selected.priority} priority
                  </Badge>
                  <Badge variant="outline" className={statusColors[selected.status]}>
                    {selected.status.replace("_", " ")}
                  </Badge>
                  <ComplaintCountdown createdAt={selected.createdAt} status={selected.status} />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Submitted By</p>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
                          {selected.submitter ? `${selected.submitter.firstName.charAt(0)}${selected.submitter.lastName.charAt(0)}` : "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {selected.submitter ? `${selected.submitter.firstName} ${selected.submitter.lastName}` : "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">{selected.submitter?.email}</p>
                      </div>
                    </div>
                  </div>

                  {(selected.targets?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Directed To</p>
                      <div className="space-y-2">
                        {selected.targets!.map((t) => (
                          <div key={t.id} className="flex items-center gap-3">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] font-semibold bg-destructive/10 text-destructive">
                                {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{t.firstName} {t.lastName}</p>
                              <p className="text-xs text-muted-foreground">{t.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                  </div>

                  {selected.resolution && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Resolution</p>
                      <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.resolution}</p>
                        {selected.resolver && (
                          <p className="text-xs text-muted-foreground mt-2">
                            — {selected.resolver.firstName} {selected.resolver.lastName}
                            {selected.resolvedAt && ` · ${new Date(selected.resolvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isAdmin && selected.status !== "resolved" && selected.status !== "dismissed" && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</p>
                      <div className="flex gap-2">
                        {selected.status === "open" && (
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => { setStatusTarget(selected); setNewStatus("in_review"); }}>
                            Mark In Review
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="flex-1 text-success hover:bg-success/10"
                          onClick={() => { setStatusTarget(selected); setNewStatus("resolved"); }}>
                          Resolve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-muted-foreground"
                          onClick={() => { setStatusTarget(selected); setNewStatus("dismissed"); }}>
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Status Update Dialog */}
      <Dialog open={!!statusTarget} onOpenChange={(open) => { if (!open) { setStatusTarget(null); setNewStatus(""); setResolution(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Complaint Status</DialogTitle>
            <DialogDescription>
              Change the status of &quot;{statusTarget?.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus || undefined} onValueChange={(v) => setNewStatus(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(newStatus === "resolved" || newStatus === "dismissed") && (
              <div className="space-y-2">
                <Label>Resolution Note (optional)</Label>
                <Textarea placeholder="Add a note about the resolution..." rows={3}
                  value={resolution} onChange={(e) => setResolution(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setStatusTarget(null); setNewStatus(""); setResolution(""); }} disabled={updatingStatus}>Cancel</Button>
            <Button onClick={handleStatusUpdate} disabled={updatingStatus || !newStatus}>
              {updatingStatus ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</> : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Complaint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
