import { Clock, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

export const statusConfig: Record<string, { label: string; style: string; icon: React.ElementType }> = {
  not_started: {
    label: "Not Started",
    style: "bg-muted text-muted-foreground border-border",
    icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    style: "bg-warning/10 text-warning border-warning/20",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    style: "bg-success/10 text-success border-success/20",
    icon: CheckCircle2,
  },
  overdue: {
    label: "Overdue",
    style: "bg-destructive/10 text-destructive border-destructive/20",
    icon: AlertTriangle,
  },
  completed_late: {
    label: "Completed Late",
    style: "bg-warning/10 text-warning border-warning/20",
    icon: AlertCircle,
  },
};

export const priorityConfig: Record<string, { label: string; style: string }> = {
  high: { label: "High", style: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Medium", style: "bg-warning/10 text-warning border-warning/20" },
  low: { label: "Low", style: "bg-muted text-muted-foreground border-border" },
};
