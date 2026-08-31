"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Target,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  tasksApi,
  departmentsApi,
  performanceApi,
  type Task,
  type TaskStats,
  type Department,
  type Performance,
} from "@/lib/api";
import { toast } from "sonner";

const statusStyles: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  not_started: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  overdue: "Overdue",
  not_started: "Not Started",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<TaskStats | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [performances, setPerformances] = React.useState<Performance[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName || "there";

  React.useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const isAdminOrSup = user?.role === "super_admin" || user?.role === "admin" || user?.role === "supervisor";

      const promises: Promise<unknown>[] = [
        tasksApi.getStats(),
        tasksApi.getAll(),
        departmentsApi.getAll(),
      ];

      if (isAdminOrSup) {
        promises.push(performanceApi.getAll());
      }

      const results = await Promise.all(promises);
      setStats((results[0] as { stats: TaskStats }).stats);
      setTasks((results[1] as { tasks: Task[] }).tasks);
      setDepartments((results[2] as { departments: Department[] }).departments);

      if (isAdminOrSup && results[3]) {
        setPerformances((results[3] as { performances: Performance[] }).performances);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Build stat cards from real data
  const statCards = [
    {
      title: "Total Tasks",
      value: stats?.total ?? 0,
      icon: ClipboardList,
      color: "text-primary dark:text-green",
      bgColor: "bg-primary/10 dark:bg-green/10",
    },
    {
      title: "Completed",
      value: stats?.completed ?? 0,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "In Progress",
      value: stats?.inProgress ?? 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Overdue",
      value: stats?.overdue ?? 0,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  // Pie chart data
  const taskDistribution = [
    { name: "Completed", value: stats?.completed ?? 0, color: "var(--success)" },
    { name: "In Progress", value: stats?.inProgress ?? 0, color: "var(--warning)" },
    { name: "Overdue", value: stats?.overdue ?? 0, color: "var(--destructive)" },
    { name: "Completed Late", value: stats?.completedLate ?? 0, color: "var(--green)" },
    { name: "Not Started", value: stats?.notStarted ?? 0, color: "var(--muted-foreground)" },
  ].filter(d => d.value > 0);

  // Performance bar chart data
  const performanceChartData = performances
    .filter(p => p.user)
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 8)
    .map((p) => ({
      name: p.user!.firstName,
      score: p.performanceScore,
      tasks: p.tasksCompleted,
    }));

  // Recent tasks (last 5)
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Top performers
  const topPerformers = [...performances]
    .filter(p => p.user)
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {greeting}, <span className="text-primary dark:text-green">{firstName}</span> 👋
        </h2>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your team&apos;s performance today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                  {stats && stats.total > 0 && stat.title !== "Total Tasks" && (
                    <p className="text-xs text-muted-foreground">
                      {Math.round((stat.value / stats.total) * 100)}% of total
                    </p>
                  )}
                </div>
                <div className={`rounded-xl p-2.5 ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Team Performance Scores
                </CardTitle>
                <CardDescription>
                  Individual performance ratings based on task completion
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                Live Data
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {performanceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceChartData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="score"
                      fill="var(--chart-1)"
                      radius={[6, 6, 0, 0]}
                      name="Score"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No performance data yet. Assign tasks to see scores.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Task Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Task Distribution
            </CardTitle>
            <CardDescription>Overall task status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {taskDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {taskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No tasks yet
                </div>
              )}
            </div>
            <div className="space-y-2 mt-2">
              {taskDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Tasks</CardTitle>
              <Badge variant="outline" className="text-xs">
                {recentTasks.length} tasks
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tasks yet</p>
            ) : (
              recentTasks.map((task) => {
                const assigneeName = task.assignee
                  ? `${task.assignee.firstName} ${task.assignee.lastName.charAt(0)}.`
                  : "Unassigned";
                const initials = task.assignee
                  ? `${task.assignee.firstName.charAt(0)}${task.assignee.lastName.charAt(0)}`
                  : "??";

                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors duration-200"
                  >
                    <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${statusStyles[task.status] || statusStyles.not_started}`}
                        >
                          {statusLabels[task.status] || task.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Due {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Department Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Department Summary</CardTitle>
                <CardDescription>Active tasks per department</CardDescription>
              </div>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No departments yet</p>
            ) : (
              departments
                .filter(d => d.totalTasks > 0 || d.staffCount > 0)
                .slice(0, 6)
                .map((dept) => (
                  <div key={dept.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{dept.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {dept.completedTasks}/{dept.totalTasks} tasks
                      </span>
                    </div>
                    <Progress
                      value={dept.totalTasks > 0 ? dept.completionRate : 0}
                      className="h-1.5"
                    />
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Top Performers</CardTitle>
                <CardDescription>Staff with highest performance scores</CardDescription>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {topPerformers.map((member, idx) => (
                <div key={member.id} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-green/10 dark:text-green text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">
                        {member.user!.firstName} {member.user!.lastName.charAt(0)}.
                      </span>
                      <span className="text-sm font-bold text-primary dark:text-green">
                        {member.performanceScore}%
                      </span>
                    </div>
                    <Progress value={member.performanceScore} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
