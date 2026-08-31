"use client";

import * as React from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Info,
  X,
  BellRing,
  Loader2,
  ExternalLink,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { notificationsApi, type Notification } from "@/lib/api";

const severityConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  warning: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
  },
  critical: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
  },
  success: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  },
  info: {
    icon: Info,
    color: "text-primary dark:text-green",
    bg: "bg-primary/10 dark:bg-green/10",
    border: "border-primary/20 dark:border-green/20",
  },
};

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("all");

  React.useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.getAll();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    const toastId = toast.loading("Marking all as read...");
    try {
      await notificationsApi.markAllAsRead();
      toast.success("All notifications marked as read", { id: toastId });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      toast.error("Failed to mark as read", { id: toastId });
    }
  };

  const dismissNotification = async (id: string) => {
    try {
      await notificationsApi.delete(id);
      const dismissed = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (dismissed && !dismissed.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success("Notification dismissed");
    } catch (error) {
      toast.error("Failed to dismiss notification");
    }
  };

  const filtered = notifications.filter((n) => {
    if (tab === "all") return true;
    if (tab === "unread") return !n.isRead;
    if (tab === "deadline_warning") return n.type === "deadline_warning";
    if (tab === "overdue_alert") return n.type === "overdue_alert";
    if (tab === "task_assigned") return n.type === "task_assigned" || n.type === "task_completed";
    return true;
  });

  const alertCount = notifications.filter((n) => n.severity === "critical").length;
  const reminderCount = notifications.filter((n) => n.severity === "warning").length;

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
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground mt-1">
            Stay updated with task reminders, deadline alerts, and performance updates
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: notifications.length, icon: Bell, color: "text-primary dark:text-green", bg: "bg-primary/10 dark:bg-green/10" },
          { label: "Unread", value: unreadCount, icon: BellRing, color: "text-warning", bg: "bg-warning/10" },
          { label: "Alerts", value: alertCount, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Reminders", value: reminderCount, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
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

      {/* Tabs and Notification List */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
          <TabsTrigger value="task_assigned">Tasks</TabsTrigger>
          <TabsTrigger value="deadline_warning">Reminders</TabsTrigger>
          <TabsTrigger value="overdue_alert">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-3 mt-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No notifications to show</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((notification) => {
              const config = severityConfig[notification.severity] || severityConfig.info;
              const Icon = config.icon;
              return (
                <Card
                  key={notification.id}
                  className={`group transition-all duration-200 hover:shadow-md cursor-pointer ${!notification.isRead ? "border-l-2 border-l-primary dark:border-l-green" : ""}`}
                  onClick={() => {
                    if (!notification.isRead) markAsRead(notification.id);
                  }}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={`shrink-0 rounded-xl p-2.5 ${config.bg} mt-0.5`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${!notification.isRead ? "" : "text-muted-foreground"}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                          {notification.relatedTask && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-primary dark:text-green font-medium">
                                {notification.relatedTask.title}
                              </span>
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                                {notification.relatedTask.status?.replace("_", " ")}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                              title="Mark as read"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); dismissNotification(notification.id); }}
                            title="Dismiss"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <Badge className="h-4 px-1.5 text-[9px] bg-primary dark:bg-green text-primary-foreground dark:text-green-foreground">
                            New
                          </Badge>
                        )}
                        <Badge variant="outline" className={`h-4 px-1.5 text-[9px] ${config.bg} ${config.color} ${config.border}`}>
                          {notification.type?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
