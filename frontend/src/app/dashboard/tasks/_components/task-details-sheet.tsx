"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Calendar, CheckCircle2, Clock, User, Building2, Flag, Pencil,
  Plus, Trash2, ChevronUp, ChevronDown, Loader2, MessageSquare,
  CornerDownRight, CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Task, type User as UserType,
  subTasksApi, taskCommentsApi,
  type SubTask, type TaskComment,
} from "@/lib/api";
import { statusConfig, priorityConfig } from "./task-status-config";

interface TaskDetailsSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: string) => void;
  onTaskChanged?: () => void;
  currentUser: UserType | null;
}

// ─── Sub-tasks tab ────────────────────────────────────────────────────────────

function SubTasksTab({
  task,
  currentUser,
  onTaskChanged,
}: {
  task: Task;
  currentUser: UserType | null;
  onTaskChanged?: () => void;
}) {
  const [subtasks, setSubtasks] = React.useState<SubTask[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newTitle, setNewTitle] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  // Staff who aren't the assignee have no access at all; the backend enforces this.
  // The assignee (regardless of role) may manage sub-tasks of their own task.
  const canManage =
    currentUser?.role !== "staff" || currentUser?.id === task.assignedToId;

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await subTasksApi.getAll(task.id);
      setSubtasks(res.subtasks);
    } catch {
      toast.error("Failed to load sub-tasks");
    } finally {
      setLoading(false);
    }
  }, [task.id]);

  React.useEffect(() => { load(); }, [load]);

  const handleToggle = async (st: SubTask) => {
    try {
      const res = await subTasksApi.update(task.id, st.id, { isCompleted: !st.isCompleted });
      setSubtasks((prev) => prev.map((s) => (s.id === st.id ? res.subtask : s)));
      // Parent task status may have auto-transitioned (in_progress / completed / completed_late)
      onTaskChanged?.();
    } catch {
      toast.error("Failed to update sub-task");
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await subTasksApi.create(task.id, newTitle.trim());
      setSubtasks((prev) => [...prev, res.subtask]);
      setNewTitle("");
    } catch (err) {
      toast.error("Failed to add sub-task", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await subTasksApi.delete(task.id, id);
      setSubtasks((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Failed to delete sub-task");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const next = [...subtasks];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setSubtasks(next);
    try {
      await subTasksApi.reorder(task.id, next.map((s) => s.id));
    } catch {
      toast.error("Failed to reorder");
      load(); // revert
    }
  };

  const completed = subtasks.filter((s) => s.isCompleted).length;
  const total = subtasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completed} of {total} completed</span>
            <span className="font-medium">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      )}

      {/* List */}
      {subtasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No sub-tasks yet.{canManage && " Add one below."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {subtasks.map((st, idx) => (
            <li
              key={st.id}
              className="flex items-center gap-2 group rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => handleToggle(st)}
                className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                aria-label={st.isCompleted ? "Mark incomplete" : "Mark complete"}
              >
                {st.isCompleted ? (
                  <CheckSquare className="h-4 w-4 text-success" />
                ) : (
                  <div className="h-4 w-4 rounded border border-muted-foreground/50" />
                )}
              </button>

              {/* Title */}
              <span className={`flex-1 text-sm ${st.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                {st.title}
              </span>

              {/* Reorder + Delete (assignees & managers) */}
              {canManage && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleMove(idx, "up")}
                    disabled={idx === 0}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(idx, "down")}
                    disabled={idx === subtasks.length - 1}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(st.id)}
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add input (assignees & managers) */}
      {canManage && (
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Add a sub-task..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            className="h-9 text-sm"
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={adding || !newTitle.trim()}
            className="h-9 gap-1.5 shadow-sm shadow-primary/20"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Comments tab ─────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CommentBubble({
  comment,
  taskId,
  currentUser,
  onDeleted,
  onReplyPosted,
  depth = 0,
}: {
  comment: TaskComment;
  taskId: string;
  currentUser: UserType | null;
  onDeleted: (id: string) => void;
  onReplyPosted: (reply: TaskComment, parentId: string) => void;
  depth?: number;
}) {
  const [showReply, setShowReply] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  const canDelete =
    currentUser?.id === comment.userId || currentUser?.role === "super_admin" || currentUser?.role === "admin";

  const handleDelete = async () => {
    try {
      await taskCommentsApi.delete(taskId, comment.id);
      onDeleted(comment.id);
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      const res = await taskCommentsApi.create(taskId, replyText.trim(), comment.id);
      onReplyPosted(res.comment, comment.id);
      setReplyText("");
      setShowReply(false);
    } catch (err) {
      toast.error("Failed to post reply", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPosting(false);
    }
  };

  const initials = `${comment.author.firstName.charAt(0)}${comment.author.lastName.charAt(0)}`;
  const name = `${comment.author.firstName} ${comment.author.lastName}`;
  const roleBadge = comment.author.role === "super_admin"
    ? "Super Admin" : comment.author.role === "admin" ? "Admin" : comment.author.role === "supervisor" ? "Supervisor" : null;

  // Cap visual indentation so deep threads remain readable
  const indentPx = Math.min(depth, 4) * 20;

  return (
    <div style={depth > 0 ? { marginLeft: indentPx } : undefined} className={depth > 0 ? "mt-2 border-l border-border pl-3" : ""}>
      <div className="flex gap-2.5">
        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
          <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold">{name}</span>
            {roleBadge && (
              <Badge variant="outline" className="text-[9px] py-0 px-1 h-4">{roleBadge}</Badge>
            )}
            <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
          </div>
          <div className="mt-1 text-sm leading-relaxed bg-muted/50 rounded-lg px-3 py-2">
            {comment.content}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button
              type="button"
              onClick={() => setShowReply(!showReply)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <CornerDownRight className="h-3 w-3" />
              Reply
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>

          {/* Reply input */}
          {showReply && (
            <div className="flex gap-2 mt-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={posting || !replyText.trim()}
                  className="h-8 text-xs shadow-sm shadow-primary/20"
                >
                  {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowReply(false); setReplyText(""); }}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies (any depth) */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 mt-3">
          {comment.replies.map((reply) => (
            <CommentBubble
              key={reply.id}
              comment={reply}
              taskId={taskId}
              currentUser={currentUser}
              onDeleted={onDeleted}
              onReplyPosted={onReplyPosted}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentsTab({
  task,
  currentUser,
}: {
  task: Task;
  currentUser: UserType | null;
}) {
  const [comments, setComments] = React.useState<TaskComment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newComment, setNewComment] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await taskCommentsApi.getAll(task.id);
        if (!cancelled) setComments(res.comments);
      } catch {
        toast.error("Failed to load comments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [task.id]);

  const handlePost = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await taskCommentsApi.create(task.id, newComment.trim());
      setComments((prev) => [...prev, { ...res.comment, replies: [] }]);
      setNewComment("");
    } catch (err) {
      toast.error("Failed to post comment", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPosting(false);
    }
  };

  const removeComment = React.useCallback((list: TaskComment[], id: string): TaskComment[] =>
    list
      .filter((c) => c.id !== id)
      .map((c) => ({ ...c, replies: c.replies ? removeComment(c.replies, id) : [] })),
    []);

  const appendReply = React.useCallback(
    (list: TaskComment[], parentId: string, reply: TaskComment): TaskComment[] =>
      list.map((c) => {
        if (c.id === parentId) {
          return { ...c, replies: [...(c.replies || []), { ...reply, replies: [] }] };
        }
        return { ...c, replies: c.replies ? appendReply(c.replies, parentId, reply) : [] };
      }),
    []
  );

  const handleDeleted = (id: string) => setComments((prev) => removeComment(prev, id));

  const handleReplyPosted = (reply: TaskComment, parentId: string) =>
    setComments((prev) => appendReply(prev, parentId, reply));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thread list */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <React.Fragment key={c.id}>
              <CommentBubble
                comment={c}
                taskId={task.id}
                currentUser={currentUser}
                onDeleted={handleDeleted}
                onReplyPosted={handleReplyPosted}
              />
              <Separator />
            </React.Fragment>
          ))}
        </div>
      )}

      {/* New comment */}
      <div className="space-y-2 pt-1">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="text-sm resize-none"
        />
        <Button
          size="sm"
          onClick={handlePost}
          disabled={posting || !newComment.trim()}
          className="gap-1.5 shadow-sm shadow-primary/20"
        >
          {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
          Post Comment
        </Button>
      </div>
    </div>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export function TaskDetailsSheet({
  task, open, onOpenChange, canEdit, canDelete, onEdit, onDelete, onStatusChange, onTaskChanged, currentUser,
}: TaskDetailsSheetProps) {
  if (!task) return null;

  const status = statusConfig[task.status] || statusConfig.not_started;
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const assigneeName = task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned";
  const initials = task.assignee ? `${task.assignee.firstName.charAt(0)}${task.assignee.lastName.charAt(0)}` : "??";
  const assignerName = task.assigner ? `${task.assigner.firstName} ${task.assigner.lastName}` : "System";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col overflow-hidden p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-base leading-snug pr-6">{task.title}</SheetTitle>
          <SheetDescription>
            Created {new Date(task.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </SheetDescription>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="outline" className={status.style}>{status.label}</Badge>
            <Badge variant="outline" className={priority.style}>
              <Flag className="h-3 w-3 mr-1" />{priority.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="details" className="flex flex-col h-full">
            <TabsList className="mx-6 mb-0 w-auto shrink-0" variant="default">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="subtasks">
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                Sub-tasks
              </TabsTrigger>
              <TabsTrigger value="comments">
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Comments
              </TabsTrigger>
            </TabsList>

            {/* ── Details ── */}
            <TabsContent value="details" className="px-6 py-4 space-y-5">
              {task.description && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</p>
                  <p className="text-sm leading-relaxed">{task.description}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned To</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary dark:bg-green/10 dark:text-green">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{assigneeName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned By</p>
                    <p className="text-sm font-medium mt-0.5">{assignerName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm font-medium mt-0.5">{task.department?.name || "No department"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className="text-sm font-medium mt-0.5">
                      {new Date(task.deadline).toLocaleDateString("en-US", {
                        weekday: "long", month: "long", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {task.completedAt && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Completed At</p>
                      <p className="text-sm font-medium mt-0.5">
                        {new Date(task.completedAt).toLocaleDateString("en-US", {
                          weekday: "long", month: "long", day: "numeric", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  {canEdit && (
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => { onOpenChange(false); onEdit(task); }}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                  {task.status !== "in_progress" && task.status !== "completed" && task.status !== "overdue" && task.status !== "completed_late" && (
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => onStatusChange(task, "in_progress")}>
                      <Clock className="h-3.5 w-3.5" /> Start Task
                    </Button>
                  )}
                  {task.status !== "completed" && task.status !== "completed_late" && (
                    <Button size="sm" className="gap-1.5 shadow-sm shadow-primary/20"
                      onClick={() => onStatusChange(task, "completed")}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {task.status === "overdue" ? "Complete (Late)" : "Mark Complete"}
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(task)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── Sub-tasks ── */}
            <TabsContent value="subtasks" className="px-6 py-4">
              <SubTasksTab task={task} currentUser={currentUser} onTaskChanged={onTaskChanged} />
            </TabsContent>

            {/* ── Comments ── */}
            <TabsContent value="comments" className="px-6 py-4">
              <CommentsTab task={task} currentUser={currentUser} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
