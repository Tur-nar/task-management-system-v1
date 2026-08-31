"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Filter, ClipboardList, CheckCircle2, Clock, AlertTriangle, Loader2, AlertCircle, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import {
  tasksApi, usersApi, departmentsApi,
  type Task, type User, type Department, type TaskStats,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

import { CreateTaskDialog } from "./_components/create-task-dialog";
import { EditTaskDialog } from "./_components/edit-task-dialog";
import { DeleteTaskDialog } from "./_components/delete-task-dialog";
import { TaskTable } from "./_components/task-table";
import { TaskDetailsSheet } from "./_components/task-details-sheet";

/** Returns "YYYY-MM" for a date string */
function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Formats "YYYY-MM" → "June 2026" */
function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function TasksPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [stats, setStats] = React.useState<TaskStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Month filter — defaults to current month
  const currentMonthKey = toMonthKey(new Date().toISOString());
  const [monthFilter, setMonthFilter] = React.useState(currentMonthKey);

  // Filters
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All Status");
  const [priorityFilter, setPriorityFilter] = React.useState("All Priority");
  const [deptFilter, setDeptFilter] = React.useState("All Departments");
  const [userFilter, setUserFilter] = React.useState("All Assignees");

  // Sheet for task details
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // Edit dialog
  const [editTask, setEditTask] = React.useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = React.useState<Task | null>(null);

  // Permissions
  const isStaff = user?.role === "staff";
  const canCreateTasks = user?.role === "super_admin" || user?.role === "admin" || user?.role === "supervisor";
  const canEditTasks = canCreateTasks;
  const canDeleteTasks = user?.role === "super_admin" || user?.role === "admin";

  React.useEffect(() => {
    if (!authLoading && user) loadData();
  }, [authLoading, user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Staff only need their own tasks + stats; departments/users endpoints not needed
      if (isStaff) {
        const [tasksRes, statsRes] = await Promise.all([
          tasksApi.getAll(),
          tasksApi.getStats(),
        ]);
        setTasks(tasksRes.tasks);
        setStats(statsRes.stats);
        return;
      }

      const [tasksRes, statsRes, deptRes] = await Promise.all([
        tasksApi.getAll(),
        tasksApi.getStats(),
        departmentsApi.getAll(),
      ]);
      setTasks(tasksRes.tasks);
      setStats(statsRes.stats);
      setDepartments(deptRes.departments);

      if (user?.role === "supervisor") {
        const teamRes = await usersApi.getTeam(user.id);
        // Include the supervisor themselves so they can self-assign tasks
        const team = teamRes.members || [];
        const selfIncluded = team.some((m) => m.id === user.id);
        setUsers(selfIncluded ? team : [user as User, ...team]);
      } else {
        const usersRes = await usersApi.getAll({ status: "active" });
        setUsers(usersRes.users);
      }
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  // Build a sorted list of unique months from the tasks (newest first)
  const availableMonths = React.useMemo(() => {
    const monthSet = new Set<string>();
    for (const t of tasks) {
      monthSet.add(toMonthKey(t.createdAt));
    }
    // Always include current month even if no tasks exist for it
    monthSet.add(currentMonthKey);
    return [...monthSet].sort().reverse();
  }, [tasks, currentMonthKey]);

  const handleStatusChange = async (task: Task, newStatus: string) => {
    const toastId = toast.loading("Updating status...");
    try {
      await tasksApi.updateStatus(task.id, newStatus);
      const label = newStatus === "completed" && task.status === "overdue" ? "completed_late" : newStatus;
      toast.success("Status updated", {
        id: toastId,
        description: `Task "${task.title}" is now ${label.replace(/_/g, " ")}.`,
      });
      await loadData();
    } catch (error) {
      toast.error("Failed to update status", {
        id: toastId,
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  };

  const openEditDialog = (task: Task) => {
    setEditTask(task);
    setEditDialogOpen(true);
  };

  // Filter tasks — month filter applied first, then other filters
  const filtered = tasks.filter((t) => {
    if (monthFilter !== "all" && toMonthKey(t.createdAt) !== monthFilter) return false;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All Status" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "All Priority" || t.priority === priorityFilter;
    const matchesDept = deptFilter === "All Departments" || t.departmentId === deptFilter || (t.department?.id === deptFilter);
    const matchesUser = userFilter === "All Assignees" || t.assignedToId === userFilter || (t.assignee?.id === userFilter);
    return matchesSearch && matchesStatus && matchesPriority && matchesDept && matchesUser;
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
            <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
            <p className="text-muted-foreground mt-1">
              Manage, assign, and track tasks across your organization
            </p>
          </div>
          {canCreateTasks && (
            <CreateTaskDialog users={users} departments={departments}
              currentUserRole={user?.role || ""} onCreated={loadData} />
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats?.total ?? 0, icon: ClipboardList, color: "text-primary dark:text-green", bg: "bg-primary/10 dark:bg-green/10" },
            { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
            { label: "In Progress", value: stats?.inProgress ?? 0, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
            { label: "Overdue", value: stats?.overdue ?? 0, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
            { label: "Completed Late", value: stats?.completedLate ?? 0, icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
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

        {/* Month Selector + Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Select value={monthFilter} onValueChange={(v) => setMonthFilter(v ?? currentMonthKey)}>
            <SelectTrigger className="w-[200px] h-10">
              <CalendarDays className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {availableMonths.map((mk) => (
                <SelectItem key={mk} value={mk}>
                  {formatMonthLabel(mk)}{mk === currentMonthKey ? " (Current)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." className="pl-9 h-10" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "All Status")}>
            <SelectTrigger className="w-[160px] h-10">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Status">All Status</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="completed_late">Completed Late</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? "All Priority")}>
            <SelectTrigger className="w-[140px] h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All Priority">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          {!isStaff && (
            <Select value={deptFilter || undefined} onValueChange={(v) => setDeptFilter(v ?? "All Departments")}>
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue placeholder="Department">
                  {departments.find((d) => d.id === deptFilter)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Departments">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!isStaff && (
            <Select value={userFilter} onValueChange={(v) => setUserFilter(v ?? "All Assignees")}>
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Assignees">All Assignees</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Task Table */}
        <TaskTable
          tasks={filtered}
          canEdit={canEditTasks}
          canDelete={canDeleteTasks}
          onViewDetails={(task) => { setSelectedTask(task); setSheetOpen(true); }}
          onEdit={openEditDialog}
          onDelete={setDeleteTarget}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Task Details Sheet */}
      <TaskDetailsSheet
        task={selectedTask} open={sheetOpen} onOpenChange={setSheetOpen}
        canEdit={canEditTasks} canDelete={canDeleteTasks}
        onEdit={openEditDialog}
        onDelete={setDeleteTarget}
        onStatusChange={handleStatusChange}
        onTaskChanged={loadData}
        currentUser={user}
      />

      {/* Edit Task Dialog */}
      <EditTaskDialog
        task={editTask} open={editDialogOpen}
        onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditTask(null); }}
        users={users} departments={departments}
        currentUserRole={user?.role || ""} onUpdated={loadData}
      />

      {/* Delete Task Dialog */}
      <DeleteTaskDialog
        task={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={loadData}
      />
    </>
  );
}
