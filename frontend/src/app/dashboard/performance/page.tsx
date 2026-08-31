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
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Star,
  Trophy,
  BarChart3,
  ArrowUpDown,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { performanceApi, departmentsApi, type Performance, type Department } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const ratingStyles: Record<string, string> = {
  excellent: "bg-success/10 text-success border-success/20",
  good: "bg-primary/10 text-primary dark:bg-green/10 dark:text-green border-primary/20 dark:border-green/20",
  average: "bg-warning/10 text-warning border-warning/20",
  needs_improvement: "bg-destructive/10 text-destructive border-destructive/20",
};

const ratingLabels: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  average: "Average",
  needs_improvement: "Needs Improvement",
};

export default function PerformancePage() {
  const { user } = useAuth();
  const [performances, setPerformances] = React.useState<Performance[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [recalculating, setRecalculating] = React.useState(false);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  React.useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const isAdminOrSup = user?.role === "super_admin" || user?.role === "admin" || user?.role === "supervisor";
      const [perfRes, deptRes] = await Promise.all([
        isAdminOrSup ? performanceApi.getAll() : performanceApi.getMine(),
        departmentsApi.getAll(),
      ]);
      if ('performances' in perfRes) {
        setPerformances(perfRes.performances);
      } else if ('performance' in perfRes) {
        setPerformances([(perfRes as { performance: Performance }).performance]);
      }
      setDepartments(deptRes.departments);
    } catch (error) {
      console.error("Failed to load performance:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter by department
  const filtered = performances.filter((p) => {
    if (deptFilter === "all") return true;
    return p.user?.departmentId === deptFilter || p.user?.department?.id === deptFilter;
  });

  const sorted = [...filtered].sort((a, b) => b.performanceScore - a.performanceScore);

  const avgScore = sorted.length > 0
    ? Math.round(sorted.reduce((a, b) => a + b.performanceScore, 0) / sorted.length)
    : 0;

  const topPerformer = sorted[0];
  const excellentCount = sorted.filter((p) => p.rating === "excellent").length;
  const needsReviewCount = sorted.filter((p) => p.rating === "needs_improvement").length;

  // Chart data
  const chartData = sorted.slice(0, 8).map((p) => ({
    name: p.user ? `${p.user.firstName}` : "?",
    score: p.performanceScore,
    onTime: p.tasksOnTime,
    late: p.tasksLate,
    completedLate: p.tasksCompletedLate || 0,
  }));

  // Radar data (aggregate team metrics)
  const totalCompleted = sorted.reduce((a, b) => a + b.tasksCompleted, 0);
  const totalOnTime = sorted.reduce((a, b) => a + b.tasksOnTime, 0);
  const totalLate = sorted.reduce((a, b) => a + b.tasksLate, 0);
  const totalCompletedLate = sorted.reduce((a, b) => a + (b.tasksCompletedLate || 0), 0);
  const totalAssigned = sorted.reduce((a, b) => a + b.totalTasksAssigned, 0);

  const radarData = [
    { metric: "Completion", value: totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0 },
    { metric: "Timeliness", value: totalCompleted > 0 ? Math.round((totalOnTime / Math.max(totalCompleted, 1)) * 100) : 0 },
    { metric: "Avg Score", value: avgScore },
    { metric: "On-Time Rate", value: totalAssigned > 0 ? Math.round((totalOnTime / totalAssigned) * 100) : 0 },
    { metric: "Excellence", value: sorted.length > 0 ? Math.round((excellentCount / sorted.length) * 100) : 0 },
    { metric: "Consistency", value: sorted.length > 0 ? Math.round(100 - (needsReviewCount / sorted.length) * 100) : 0 },
  ];

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
          <h2 className="text-2xl font-bold tracking-tight">Performance</h2>
          <p className="text-muted-foreground mt-1">
            Track and analyze team member performance ratings and work rate
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            className="gap-2"
            disabled={recalculating}
            onClick={async () => {
              setRecalculating(true);
              try {
                await performanceApi.recalculate();
                toast.success("Performance scores recalculated");
                await loadData();
              } catch (error) {
                toast.error("Failed to recalculate");
              } finally {
                setRecalculating(false);
              }
            }}
          >
            <RefreshCw className={`h-4 w-4 ${recalculating ? "animate-spin" : ""}`} />
            Refresh Scores
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-primary/10 dark:bg-green/10">
              <BarChart3 className="h-5 w-5 text-primary dark:text-green" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. Score</p>
              <p className="text-2xl font-bold">{avgScore}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-success/10">
              <Trophy className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Top Performer</p>
              <p className="text-lg font-bold">
                {topPerformer?.user ? `${topPerformer.user.firstName} ${topPerformer.user.lastName.charAt(0)}.` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-success/10">
              <Star className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Excellent Ratings</p>
              <p className="text-2xl font-bold">{excellentCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="rounded-xl p-2.5 bg-destructive/10">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Needs Review</p>
              <p className="text-2xl font-bold">{needsReviewCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {sorted.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Performance Comparison
              </CardTitle>
              <CardDescription>
                Individual scores and task completion breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="score" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="Score" />
                    <Bar dataKey="onTime" fill="var(--chart-2)" radius={[4, 4, 0, 0]} name="On Time" />
                    <Bar dataKey="late" fill="var(--destructive)" radius={[4, 4, 0, 0]} name="Late" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Team Metrics
              </CardTitle>
              <CardDescription>Aggregate performance across key areas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid className="stroke-border" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                    />
                    <PolarRadiusAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Radar
                      dataKey="value"
                      stroke="var(--chart-1)"
                      fill="var(--chart-1)"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Individual Performance Ratings
              </CardTitle>
              <CardDescription>
                Detailed breakdown of each team member&apos;s performance
              </CardDescription>
            </div>
            <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? "all")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Staff Member</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Score <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Tasks Completed</TableHead>
                <TableHead>On Time</TableHead>
                <TableHead>Completed Late</TableHead>
                <TableHead>Overdue</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No performance data yet.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((member, idx) => {
                  const fullName = member.user ? `${member.user.firstName} ${member.user.lastName}` : "Unknown";
                  const initials = member.user ? `${member.user.firstName.charAt(0)}${member.user.lastName.charAt(0)}` : "??";
                  const deptName = member.user?.department?.name || "—";
                  const ratingLabel = ratingLabels[member.rating] || member.rating;
                  const ratingStyle = ratingStyles[member.rating] || ratingStyles.average;

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? "bg-green/10 text-green" : "bg-muted text-muted-foreground"}`}>
                          {idx + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{deptName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={member.performanceScore} className="h-1.5 w-16" />
                          <span className="text-sm font-semibold">{member.performanceScore}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{member.tasksCompleted}</TableCell>
                      <TableCell className="text-sm text-success font-medium">{member.tasksOnTime}</TableCell>
                      <TableCell className="text-sm text-warning font-medium">{member.tasksCompletedLate || 0}</TableCell>
                      <TableCell className="text-sm text-destructive font-medium">{member.tasksLate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${ratingStyle}`}>
                          {ratingLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
