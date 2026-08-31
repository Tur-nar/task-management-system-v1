const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * User type matching the backend User model (without password).
 */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'staff';
  status: 'active' | 'inactive';
  lastLogin: string | null;
  departmentId: string | null;
  supervisorId: string | null;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
  } | null;
  supervisor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  performance?: {
    id: string;
    tasksCompleted: number;
    tasksOnTime: number;
    tasksLate: number;
    totalTasksAssigned: number;
    performanceScore: number;
    rating: string;
  } | null;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}

/**
 * Get the auth token from localStorage.
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Set the auth token in localStorage.
 */
export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

/**
 * Remove the auth token from localStorage.
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}

/**
 * Core fetch wrapper with auth headers and error handling.
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 — token expired or invalid
  if (response.status === 401) {
    removeToken();
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    const error = await response.json();
    throw new Error(error.error || 'Authentication required.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ──────────────────────────────────────────────
// Auth API
// ──────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () =>
    apiFetch<{ user: User }>('/api/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ message: string }>('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  updateProfile: (firstName: string, lastName: string) =>
    apiFetch<{ message: string; user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ firstName, lastName }),
    }),
};

export const usersApi = {
  getAll: (params?: { role?: string; departmentId?: string; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<{ users: User[] }>(`/api/users${query ? `?${query}` : ''}`);
  },

  getById: (id: string) =>
    apiFetch<{ user: User }>(`/api/users/${id}`),

  getSupervisors: () =>
    apiFetch<{ supervisors: User[] }>('/api/users/supervisors'),

  create: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    departmentId?: string;
    supervisorId?: string;
  }) =>
    apiFetch<{ message: string; user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<User>) =>
    apiFetch<{ message: string; user: User }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleStatus: (id: string) =>
    apiFetch<{ message: string; status: string }>(`/api/users/${id}/status`, {
      method: 'PATCH',
    }),

  getTeam: (id: string) =>
    apiFetch<{ members: User[] }>(`/api/users/${id}/team`),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    }),

  reassignTeam: (supervisorId: string, newSupervisorId: string, memberIds?: string[]) =>
    apiFetch<{ message: string; reassignedCount: number }>(`/api/users/${supervisorId}/reassign-team`, {
      method: 'PATCH',
      body: JSON.stringify({ newSupervisorId, ...(memberIds ? { memberIds } : {}) }),
    }),
};

// ──────────────────────────────────────────────
// Departments API
// ──────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  description: string | null;
  headId: string | null;
  head: { id: string; firstName: string; lastName: string; email: string } | null;
  staff: User[];
  tasks: Task[];
  staffCount: number;
  activeTasks: number;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
}

export const departmentsApi = {
  getAll: () =>
    apiFetch<{ departments: Department[] }>('/api/departments'),

  getById: (id: string) =>
    apiFetch<{ department: Department }>(`/api/departments/${id}`),

  create: (data: { name: string; description?: string; headId?: string }) =>
    apiFetch<{ message: string; department: Department }>('/api/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Department>) =>
    apiFetch<{ message: string; department: Department }>(`/api/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/departments/${id}`, {
      method: 'DELETE',
    }),
};

// ──────────────────────────────────────────────
// Tasks API
// ──────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'completed_late';
  priority: 'high' | 'medium' | 'low';
  deadline: string;
  completedAt: string | null;
  assignedToId: string;
  assignedById: string;
  departmentId: string | null;
  assignee?: { id: string; firstName: string; lastName: string; email: string } | null;
  assigner?: { id: string; firstName: string; lastName: string; email: string } | null;
  department?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  notStarted: number;
  completedLate: number;
  completionRate: number;
}

export const tasksApi = {
  getAll: (params?: { status?: string; priority?: string; departmentId?: string; assignedToId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<{ tasks: Task[] }>(`/api/tasks${query ? `?${query}` : ''}`);
  },

  getStats: () =>
    apiFetch<{ stats: TaskStats }>('/api/tasks/stats'),

  getById: (id: string) =>
    apiFetch<{ task: Task }>(`/api/tasks/${id}`),

  create: (data: {
    title: string;
    description?: string;
    priority?: string;
    deadline: string;
    assignedToId: string;
    departmentId?: string;
  }) =>
    apiFetch<{ message: string; task: Task }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Task>) =>
    apiFetch<{ message: string; task: Task }>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    apiFetch<{ message: string; task: Task }>(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),
};

// ──────────────────────────────────────────────
// Targets API
// ──────────────────────────────────────────────

export interface Target {
  id: string;
  title: string;
  type: 'individual' | 'team';
  description: string | null;
  targetValue: number;
  currentValue: number;
  status: 'on_track' | 'at_risk' | 'completed' | 'missed';
  deadline: string;
  assignee?: { id: string; firstName: string; lastName: string; email?: string } | null;
  creator?: { id: string; firstName: string; lastName: string } | null;
  department?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TargetEntry {
  id: string;
  value: number;
  note: string | null;
  targetId: string;
  userId: string;
  submitter: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export const targetsApi = {
  getAll: (params?: { type?: string; status?: string; departmentId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<{ targets: Target[] }>(`/api/targets${query ? `?${query}` : ''}`);
  },

  create: (data: Partial<Target>) =>
    apiFetch<{ message: string; target: Target }>('/api/targets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Target>) =>
    apiFetch<{ message: string; target: Target }>(`/api/targets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateProgress: (id: string, currentValue: number) =>
    apiFetch<{ message: string; target: Target }>(`/api/targets/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ currentValue }),
    }),

  getEntries: (targetId: string) =>
    apiFetch<{ entries: TargetEntry[] }>(`/api/targets/${targetId}/entries`),

  addEntry: (targetId: string, data: { value: number; note?: string }) =>
    apiFetch<{ message: string; entry: TargetEntry; currentValue: number; targetValue: number; status: string }>(`/api/targets/${targetId}/entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteEntry: (targetId: string, entryId: string) =>
    apiFetch<{ message: string; currentValue: number; status: string }>(`/api/targets/${targetId}/entries/${entryId}`, {
      method: 'DELETE',
    }),
};

// ──────────────────────────────────────────────
// Performance API
// ──────────────────────────────────────────────

export interface Performance {
  id: string;
  tasksCompleted: number;
  tasksOnTime: number;
  tasksLate: number;
  tasksCompletedLate: number;
  totalTasksAssigned: number;
  performanceScore: number;
  rating: string;
  user?: User;
}

export const performanceApi = {
  getAll: (departmentId?: string) => {
    const query = departmentId ? `?departmentId=${departmentId}` : '';
    return apiFetch<{ performances: Performance[] }>(`/api/performance${query}`);
  },

  getMine: () =>
    apiFetch<{ performance: Performance }>('/api/performance/me'),

  getByDepartment: (id: string) =>
    apiFetch<{ performances: Performance[] }>(`/api/performance/department/${id}`),

  recalculate: () =>
    apiFetch<{ message: string }>('/api/performance/recalculate', {
      method: 'POST',
    }),
};

// ──────────────────────────────────────────────
// Sub-tasks API
// ──────────────────────────────────────────────

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}

export const subTasksApi = {
  getAll: (taskId: string) =>
    apiFetch<{ subtasks: SubTask[] }>(`/api/tasks/${taskId}/subtasks`),

  create: (taskId: string, title: string) =>
    apiFetch<{ subtask: SubTask }>(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  update: (taskId: string, id: string, data: { title?: string; isCompleted?: boolean }) =>
    apiFetch<{ subtask: SubTask }>(`/api/tasks/${taskId}/subtasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (taskId: string, id: string) =>
    apiFetch<{ message: string }>(`/api/tasks/${taskId}/subtasks/${id}`, {
      method: 'DELETE',
    }),

  reorder: (taskId: string, orderedIds: string[]) =>
    apiFetch<{ message: string }>(`/api/tasks/${taskId}/subtasks/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    }),
};

// ──────────────────────────────────────────────
// Task Comments API
// ──────────────────────────────────────────────

export interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface TaskComment {
  id: string;
  content: string;
  taskId: string;
  userId: string;
  parentCommentId: string | null;
  author: CommentAuthor;
  replies?: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

export const taskCommentsApi = {
  getAll: (taskId: string) =>
    apiFetch<{ comments: TaskComment[] }>(`/api/tasks/${taskId}/comments`),

  create: (taskId: string, content: string, parentCommentId?: string) =>
    apiFetch<{ comment: TaskComment }>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, ...(parentCommentId ? { parentCommentId } : {}) }),
    }),

  delete: (taskId: string, id: string) =>
    apiFetch<{ message: string }>(`/api/tasks/${taskId}/comments/${id}`, {
      method: 'DELETE',
    }),
};

// ──────────────────────────────────────────────
// Notifications API
// ──────────────────────────────────────────────

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  isRead: boolean;
  createdAt: string;
  relatedTask?: { id: string; title: string; status: string; deadline: string } | null;
}

export const notificationsApi = {
  getAll: (params?: { type?: string; isRead?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<{ notifications: Notification[]; unreadCount: number }>(`/api/notifications${query ? `?${query}` : ''}`);
  },

  markAsRead: (id: string) =>
    apiFetch<{ message: string }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: () =>
    apiFetch<{ message: string }>('/api/notifications/read-all', {
      method: 'PATCH',
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/notifications/${id}`, {
      method: 'DELETE',
    }),
};

// ──────────────────────────────────────────────
// Complaints API
// ──────────────────────────────────────────────

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: 'bug' | 'complaint' | 'suggestion' | 'error' | 'other';
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_review' | 'resolved' | 'dismissed' | 'overlooked';
  resolution: string | null;
  resolvedAt: string | null;
  userId: string;
  resolvedById: string | null;
  submitter?: { id: string; firstName: string; lastName: string; email: string; role: string } | null;
  resolver?: { id: string; firstName: string; lastName: string; email: string } | null;
  targets?: { id: string; firstName: string; lastName: string; email: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintStats {
  total: number;
  open: number;
  inReview: number;
  resolved: number;
  dismissed: number;
  overlooked: number;
}

export const complaintsApi = {
  getAll: (params?: { status?: string; category?: string; priority?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<{ complaints: Complaint[] }>(`/api/complaints${query ? `?${query}` : ''}`);
  },

  getStats: () =>
    apiFetch<{ stats: ComplaintStats }>('/api/complaints/stats'),

  getById: (id: string) =>
    apiFetch<{ complaint: Complaint }>(`/api/complaints/${id}`),

  create: (data: {
    title: string;
    description: string;
    category?: string;
    priority?: string;
    targetUserIds?: string[];
  }) =>
    apiFetch<{ message: string; complaint: Complaint }>('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string, resolution?: string) =>
    apiFetch<{ message: string; complaint: Complaint }>(`/api/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(resolution ? { resolution } : {}) }),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/complaints/${id}`, {
      method: 'DELETE',
    }),
};
