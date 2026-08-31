export interface SupervisorData {
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
