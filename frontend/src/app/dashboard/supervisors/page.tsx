"use client";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, TrendingUp, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usersApi, tasksApi, type User, type Task } from "@/lib/api";
import { useAuth } from "@/lib/auth";

import { SupervisorCard } from "./_components/supervisor-card";
import { TeamSheet } from "./_components/team-sheet";
import { ReassignDialog } from "./_components/reassign-dialog";

interface SupervisorData {
  id: string;
  name: string;
  initials: string;
  email: string;
  department: string;
  departmentId: string;
  teamSize: number;
  teamMembers: { id: string; name: string; email: string; status: string }[];
  activeTasks: number;
  overdueAlerts: number;
}

export default function SupervisorsPage() {
  const { user: currentUser } = useAuth();
  const [supervisors, setSupervisors] = React.useState<SupervisorData[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Sheet for viewing team
  const [teamSheet, setTeamSheet] = React.useState<SupervisorData | null>(null);
  // Reassign dialog
  const [reassignTarget, setReassignTarget] = React.useState<SupervisorData | null>(null);

  const isAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";

  React.useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [supRes, usersRes, tasksRes] = await Promise.all([
        usersApi.getSupervisors(),
        usersApi.getAll({ status: "active" }),
        tasksApi.getAll(),
      ]);

      const allUsers = usersRes.users;
      const allTasks = tasksRes.tasks;

      const supData: SupervisorData[] = supRes.supervisors.map((sup) => {
        const teamMembers = allUsers.filter((u) => u.supervisorId === sup.id);
        const teamMemberIds = teamMembers.map((m) => m.id);
        const teamTasks = allTasks.filter((t) => teamMemberIds.includes(t.assignedToId));
        const activeTasks = teamTasks.filter((t) => t.status !== "completed" && t.status !== "completed_late").length;
        const overdueAlerts = teamTasks.filter((t) => t.status === "overdue").length;

        return {
          id: sup.id,
          name: `${sup.firstName} ${sup.lastName}`,
          initials: `${sup.firstName.charAt(0)}${sup.lastName.charAt(0)}`,
          email: sup.email,
          department: sup.department?.name || "—",
          departmentId: sup.departmentId || "",
          teamSize: teamMembers.length,
          teamMembers: teamMembers.map((m) => ({
            id: m.id,
            name: `${m.firstName} ${m.lastName}`,
            email: m.email,
            status: m.status,
          })),
          activeTasks,
          overdueAlerts,
        };
      });

      setSupervisors(supData);
    } catch (error) {
      toast.error("Failed to load supervisors");
    } finally {
      setLoading(false);
    }
  };

  const totalTeamMembers = supervisors.reduce((a, b) => a + b.teamSize, 0);
  const totalAlerts = supervisors.reduce((a, b) => a + b.overdueAlerts, 0);

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
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Supervisors</h2>
          <p className="text-muted-foreground mt-1">
            View supervisors, their teams, and team performance overview
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: "Supervisors", value: supervisors.length, icon: Shield, color: "text-green", bg: "bg-green/10" },
            { label: "Team Members", value: totalTeamMembers, icon: Users, color: "text-primary dark:text-green", bg: "bg-primary/10 dark:bg-green/10" },
            { label: "Active Tasks", value: supervisors.reduce((a, b) => a + b.activeTasks, 0), icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
            { label: "Overdue Alerts", value: totalAlerts, icon: ClipboardList, color: "text-destructive", bg: "bg-destructive/10" },
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

        {/* Supervisor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {supervisors.length === 0 ? (
            <Card className="md:col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                No supervisors registered yet.
              </CardContent>
            </Card>
          ) : (
            supervisors.map((supervisor) => (
              <SupervisorCard
                key={supervisor.id}
                supervisor={supervisor}
                isAdmin={isAdmin}
                onViewTeam={setTeamSheet}
                onReassign={(s) => { setReassignTarget(s); }}
              />
            ))
          )}
        </div>
      </div>

      <TeamSheet
        supervisor={teamSheet} onClose={() => setTeamSheet(null)}
        isAdmin={isAdmin}
        onReassign={
          (s) => {
            setReassignTarget(s);
            setTeamSheet(null);
          }
        }
      />

      {/* Reassign Dialog */}
      <ReassignDialog
        supervisor={reassignTarget}
        allSupervisors={supervisors}
        onClose={() => setReassignTarget(null)}
        onReassigned={loadData}
      />
    </>
  );
}
