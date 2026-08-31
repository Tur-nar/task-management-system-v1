# TaskManager Pro — Complete Project Documentation

> **Version:** 2.7.0  
> **Last Updated:** June 4, 2026  
> **Organization:** Msspaceglobal  
> **Project Type:** Full-Stack Task Management System

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Frontend](#frontend)
4. [Backend](#backend)
5. [Design System](#design-system)
6. [UI Component Library](#ui-component-library)
7. [Pages & Features](#pages--features)
8. [API Endpoints](#api-endpoints)
9. [Database Schema](#database-schema)
10. [Authentication & Authorization](#authentication--authorization)
11. [Performance Scoring](#performance-scoring)
12. [Notifications & Alerts](#notifications--alerts)
13. [Development Guide](#development-guide)
14. [Deployment](#deployment)

---

## Project Overview

TaskManager Pro is a comprehensive, enterprise-grade task management system designed for Msspaceglobal. It enables administrators and supervisors to efficiently manage team workflows, track individual performance, and drive organizational productivity.

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Task Management** | Create, assign, track, update, and delete tasks with priority levels and deadlines |
| **Sub-tasks** | Checklist-style sub-tasks per task with progress tracking; addable at creation time |
| **Task Comments** | Threaded comments with replies on individual tasks; all roles can participate |
| **Performance Rating** | Automated real-time scoring based on task completion, timeliness, and workload |
| **Staff Management** | Register staff, assign roles, departments, and supervisors; activate/deactivate/delete accounts |
| **Department Management** | Create, edit, delete departments; assign department heads; track department completion rates |
| **Supervisor Management** | View supervisor teams, selectively reassign individual or all team members between same-department supervisors |
| **Target Tracking** | Set individual and team targets with progress entries, deadline monitoring, and missed target detection |
| **Decision Support** | Analytics charts (bar, pie, radar, line) for data-driven performance evaluation |
| **Automated Reminders** | Cron-based alerts when tasks approach or exceed deadlines |
| **Overdue Alerts** | Supervisor and admin notifications when work is late |

### Roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full access: manage staff, departments, tasks, targets, performance, delete users, reassign teams, promote/demote admins |
| **Admin** | Same as Super Admin except: cannot modify other admins or the super admin, cannot promote others to admin. Can be demoted by super admin. |
| **Supervisor** | Create/edit tasks for their own team or themselves (self-assignment), view team performance, receive completion notifications |
| **Staff** | View/update own tasks (status changes only), view own performance score |

---

## Architecture

```
task manager/
├── frontend/                     # Next.js 16 + shadcn/ui v4 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout with Toaster, ThemeProvider (defaultTheme="system"), Sidebar
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── login/page.tsx    # Authentication page
│   │   │   ├── globals.css       # Design tokens (CSS custom properties)
│   │   │   └── dashboard/
│   │   │       ├── page.tsx          # Dashboard overview
│   │   │       ├── layout.tsx        # Dashboard layout (sidebar + content)
│   │   │       ├── tasks/
│   │   │       │   ├── page.tsx      # Task management (orchestrator)
│   │   │       │   └── _components/  # Extracted task components
│   │   │       │       ├── task-table.tsx
│   │   │       │       ├── task-details-sheet.tsx  # Tabs: Details / Sub-tasks / Comments
│   │   │       │       ├── create-task-dialog.tsx  # Includes sub-task drafts on creation
│   │   │       │       ├── edit-task-dialog.tsx
│   │   │       │       └── delete-task-dialog.tsx
│   │   │       ├── targets/
│   │   │       │   ├── page.tsx          # Target tracking (orchestrator)
│   │   │       │   └── _components/
│   │   │       │       └── target-detail-sheet.tsx  # Progress entries, add entry, timeline
│   │   │       ├── performance/page.tsx  # Performance analytics
│   │   │       ├── notifications/page.tsx # Notification center
│   │   │       ├── staff/
│   │   │       │   ├── page.tsx      # Staff management (orchestrator)
│   │   │       │   └── _components/  # Create, Edit, Table, Profile, Dialogs
│   │   │       ├── departments/
│   │   │       │   ├── page.tsx      # Department management (orchestrator)
│   │   │       │   └── _components/  # Create, Edit, Card, Details, Delete
│   │   │       ├── complaints/
│   │   │       │   └── page.tsx      # Complaints & issues (all roles)
│   │   │       └── supervisors/
│   │   │           ├── page.tsx      # Supervisor overview (orchestrator)
│   │   │           └── _components/  # Card, TeamSheet, ReassignDialog, types
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components (20+ components)
│   │   │   ├── app-sidebar.tsx   # Navigation sidebar (includes Change Password menu item)
│   │   │   ├── change-password-dialog.tsx  # Change password dialog (current + new + confirm)
│   │   │   ├── theme-provider.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── hooks/
│   │   │   └── use-mobile.tsx
│   │   └── lib/
│   │       ├── api.ts            # Centralized API client with types (includes SubTask, TaskComment)
│   │       ├── auth.tsx          # AuthContext provider
│   │       └── utils.ts          # Utility functions
│   └── package.json
│
├── task-back-end-main/           # Express.js backend
│   ├── server.js                 # Entry point, middleware, routes
│   └── src/
│       ├── config/database.js    # Sequelize configuration (SQLite/PostgreSQL)
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── user.controller.js
│       │   ├── department.controller.js
│       │   ├── task.controller.js
│       │   ├── target.controller.js
│       │   ├── performance.controller.js
│       │   ├── notification.controller.js
│       │   ├── subtask.controller.js      # Sub-task CRUD + reorder
│       │   └── taskcomment.controller.js  # Threaded comments CRUD
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── user.routes.js
│       │   ├── department.routes.js
│       │   ├── task.routes.js
│       │   ├── target.routes.js
│       │   ├── performance.routes.js
│       │   ├── notification.routes.js
│       │   ├── subtask.routes.js          # Nested under /api/tasks/:taskId/subtasks
│       │   ├── taskcomment.routes.js      # Nested under /api/tasks/:taskId/comments
│       │   └── complaint.routes.js        # Complaint/issue CRUD
│       ├── models/
│       │   ├── index.js          # Model associations
│       │   ├── User.js
│       │   ├── Task.js
│       │   ├── Department.js
│       │   ├── Target.js
│       │   ├── TargetEntry.js    # Progress entry logs per target
│       │   ├── Performance.js
│       │   ├── Notification.js
│       │   ├── SubTask.js        # Sub-task checklist items
│       │   ├── TaskComment.js    # Threaded comments (self-referencing for replies)
│       │   ├── Complaint.js      # Complaints/issues (bugs, errors, suggestions)
│       │   └── ComplaintTarget.js # Join table: Complaint ↔ targeted Users (many-to-many)
│       ├── services/
│       │   ├── email.service.js   # Resend-based email delivery (HTTPS API)
│       │   └── performance.service.js  # Score calculation logic
│       ├── jobs/cron.js          # Scheduled jobs
│       ├── middlewares/
│       │   ├── auth.js           # JWT authentication
│       │   └── roles.js          # Role-based authorization
│       ├── seeders/seed.js       # Database seeding
│       └── utils/
│           ├── jwt.js
│           └── logger.js
│
└── DOCUMENTATION.md              # This file
```

---

## Frontend

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.2.3 | React framework with App Router |
| **React** | 19.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **shadcn/ui** | v4 (base-nova) | Component library (uses @base-ui/react) |
| **Sonner** | 2.x | Toast notification system |
| **next-themes** | — | Dark/light/system mode switching |
| **Recharts** | 2.x | Charts and data visualization |
| **Lucide React** | — | Icon library |
| **Inter** | Google Font | Primary typography |

### Project Setup

```bash
cd frontend
npm install
npm run dev          # Development at http://localhost:3001
npm run build        # Production build
npm start            # Start production server
```

### Environment Variables

Create `.env.local` in `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

> **Important:** The `http://` prefix is required. Without it, `fetch()` treats the value as a relative path and no network request is made.

### Component Library: shadcn/ui v4

The project uses **shadcn/ui v4** with the **base-nova** style, built on **@base-ui/react** (not Radix).

**Key API difference from older shadcn:** Components use the `render` prop pattern instead of `asChild`:

```tsx
// ✅ Correct (base-ui / shadcn v4)
<DialogTrigger render={<Button />}>
  Click me
</DialogTrigger>

// ❌ Incorrect (old Radix-based shadcn)
<DialogTrigger asChild>
  <Button>Click me</Button>
</DialogTrigger>
```

**Select component gotcha:** When using Select with UUID values (like IDs), pass `undefined` instead of empty string to avoid displaying raw UUIDs:

```tsx
// ✅ Correct — shows placeholder when no value selected
<Select value={formValue || undefined} onValueChange={setValue}>

// ❌ Incorrect — shows empty string as value
<Select value={formValue} onValueChange={setValue}>
```

### Installed UI Components

| Component | Usage |
|-----------|-------|
| Alert Dialog | Confirmation dialogs for destructive actions (delete, deactivate) |
| Avatar | User profile initials |
| Badge | Status, role, and priority indicators |
| Button | All interactive actions |
| Card | Content containers, stat cards, detail cards |
| Dialog | Create/edit forms (tasks, targets, staff, change password) |
| Drawer | Mobile-optimized alternate to Sheet |
| Dropdown Menu | Row actions, context menus |
| Input / Textarea | Form fields |
| Label | Form labels |
| Popover | Calendar date picker |
| Progress | Performance score bars, sub-task completion bar |
| Select | Dropdowns for department, staff, role, priority |
| Separator | Visual dividers |
| Sheet | Slide-over panels (task details with tabs, staff profile, team view, edit dept) |
| Sidebar | Main navigation |
| Skeleton | Loading states |
| Sonner (Toaster) | Toast notifications (success, error, loading) |
| Table | Data tables for tasks, staff, performance |
| Tabs | Content tab navigation (Details / Sub-tasks / Comments in task sheet) |
| Tooltip | Hover hints |

### Notification System

All user-facing feedback uses **Sonner** toast notifications instead of browser `alert()` / `confirm()`:

```tsx
import { toast } from "sonner";

// Loading → Success pattern
const toastId = toast.loading("Creating task...");
try {
  await tasksApi.create(data);
  toast.success("Task created", { id: toastId, description: "Details..." });
} catch (error) {
  toast.error("Failed to create task", { id: toastId });
}
```

All destructive actions (delete, deactivate) use `AlertDialog` for explicit confirmation.

---

## Backend

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 22+ | Runtime |
| **Express.js** | 4.x | Web framework |
| **Sequelize** | 6.x | ORM |
| **SQLite** | — | Default database (local development) |
| **PostgreSQL** | — | Production database (optional) |
| **JSON Web Token** | 9.x | Authentication |
| **bcryptjs** | — | Password hashing |
| **Resend** | 4.x | Email delivery (HTTPS API) |
| **Winston** | 3.x | Logging |
| **Morgan** | 1.x | HTTP request logger |
| **node-cron** | 3.x | Scheduled tasks |
| **dotenv** | 16.x | Environment variables |

### Environment Variables

Create `.env` in `task-back-end-main/`:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=supersecretkey
FRONTEND_URL=http://localhost:3001

# SQLite (default for local development)
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite

# PostgreSQL (uncomment to switch)
# DB_DIALECT=postgres
# DB_NAME=taskmanager_db
# DB_USER=postgres
# DB_PASS=yourpassword
# DB_HOST=localhost
# DB_PORT=5432

# Email (Resend — https://resend.com)
RESEND_API_KEY=re_your_api_key_here
MAIL_FROM_ADDRESS=noreply@msspaceglobal.com
MAIL_FROM_NAME=MSSpace TaskManager
```

### Backend Setup

```bash
cd task-back-end-main
npm install
npm start            # Production server at http://localhost:3000
npm run dev          # Development with nodemon
```

> **SQLite note:** On first run (or after adding new models), Sequelize uses `alter: true` to update the schema. Foreign key enforcement is temporarily disabled during this process to prevent constraint errors when tables are recreated. This is handled automatically in `server.js`.

---

## Design System

### Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Navy Blue** | `#1C2458` | Primary (light mode), sidebar, headings |
| **Gold** | `#B78B23` | Accent, focus rings, primary (dark mode) |
| **Deep Navy** | `#0D1128` | Dark mode background |
| **Light Navy** | `#2E3A7A` | Dark mode secondary |
| **Success** | `#16A34A` / `#22C55E` | Completed states, active badges |
| **Destructive** | `#DC2626` / `#EF4444` | Delete, deactivate, overdue |
| **Warning** | `#D97706` / `#F59E0B` | Deadline warnings |

### Typography

- **Font Family:** Inter (Google Fonts)
- **Headings:** Inter 700–800 weight
- **Body:** Inter 400–500 weight
- **Monospace:** Geist Mono

### Theme

The app defaults to **system** theme (respects OS dark/light preference). Users can toggle between light, dark, and system via the theme toggle in the sidebar. Edit `src/app/globals.css` to modify CSS custom properties under `:root` (light) and `.dark` (dark).

---

## Pages & Features

### Route Map

| Route | Page | Access |
|-------|------|--------|
| `/` | Landing Page | Public |
| `/login` | Login | Public |
| `/dashboard` | Dashboard Overview | Authenticated |
| `/dashboard/tasks` | Task Management | Authenticated (role-filtered) |
| `/dashboard/targets` | Target Tracking | Authenticated |
| `/dashboard/performance` | Performance Analytics | Admin / Supervisor |
| `/dashboard/notifications` | Notification Center | Authenticated |
| `/dashboard/complaints` | Complaints & Issues | Authenticated |
| `/dashboard/staff` | Staff Management | Admin / Supervisor |
| `/dashboard/departments` | Department Management | Authenticated |
| `/dashboard/supervisors` | Supervisor Overview | Authenticated |

### Page Details

#### Login (`/login`)
- Email + password authentication with `@msspaceglobal.com` domain enforcement
- Password visibility toggle
- Toast notifications for login success/failure with loading states
- Auto-redirect to dashboard when already authenticated

#### Dashboard Overview (`/dashboard`)
- **Stat cards:** Total tasks, completed, in-progress, overdue (with percentages)
- **Performance bar chart:** Top 8 team members by score
- **Task distribution pie chart:** Status breakdown
- **Weekly trend line chart:** Tasks assigned vs completed over 6 weeks
- **Recent tasks list:** Latest tasks with status badges and assignee
- **Top performers:** Ranked with progress bars and rating badges
- **Department summary:** Active tasks and completion rates per department

#### Tasks (`/dashboard/tasks`)
- **Create task dialog:** Title, description, assignee (Select), priority, department, deadline; optional sub-tasks section to add checklist items before saving
- **Search & filter:** By task name/description, status, priority; department and assignee filters hidden for staff users
- **Sortable table:** Task name, assignee, department, status, priority, deadline
- **Task Details Sheet:** Three-tab layout:
  - **Details tab:** Full task info, quick status change, edit/delete actions
  - **Sub-tasks tab:** Checklist progress bar; all roles can check/uncheck; admin/supervisor can add, reorder (up/down), and delete sub-tasks
  - **Comments tab:** Threaded comments with replies; all roles can post and reply; authors can delete their own comments; super admin can delete any comment
- **AlertDialog:** Safe delete confirmation
- **Toast notifications:** Create, update, status change, delete feedback
- **Role-based access:**
  - Staff: sees only own tasks; department and assignee filters hidden; no calls to restricted endpoints
  - Supervisor: sees team tasks; can create/edit tasks; can self-assign tasks
  - Super Admin: sees all tasks; full CRUD

#### Targets (`/dashboard/targets`)
- **Summary cards:** Total targets, completed, on track, at risk, missed
- **Filter tabs:** All, On Track, At Risk, Missed, Completed
- **Create dialog:** Title, type (team/individual), department, assignee, goal, deadline
- **Edit dialog:** Update existing targets — title, description, type, department, assignee, goal, deadline; accessible via dropdown menu on each target card (admin/supervisor only)
- **Target cards:** Progress bars, current vs target values, status badges, deadline countdown (days left / days overdue); clickable to open detail sheet; missed targets highlighted with red border
- **Target Detail Sheet:** Slide-over panel with:
  - Full target info: title, type, department, assignee, status, description
  - Progress bar with current/target and percentage
  - Deadline with countdown/overdue indicator
  - **Log Progress form:** Number input + optional note; access-controlled (individual: assignee only; team: department members; admin/supervisor: always)
  - **Progress Entries timeline:** Chronological list showing submitter name, value, note, and timestamp; admin/supervisor can delete entries via AlertDialog confirmation
- **Toast notifications:** Create, update, add entry, and error feedback
- **Role-based visibility:** Staff see own individual targets + department team targets; admin/supervisor see all

#### Performance (`/dashboard/performance`)
- **Summary cards:** Average score, top performer, excellent count, needs review count
- **Refresh Scores button:** Admin can trigger real-time recalculation of all scores
- **Comparison bar chart:** Score, on-time, and late counts for top 8
- **Radar chart:** Team-wide metrics across 6 dimensions
- **Detailed table:** Rankings with score progress bars, trend indicators, rating badges
- **Department filter:** Filter performance data by department
- **Real-time updates:** Performance recalculates instantly when tasks are completed

#### Notifications (`/dashboard/notifications`)
- **Summary cards:** Total, unread, critical alerts, reminders
- **Tabs:** All, Unread, Reminders, Alerts
- **Notification cards:** Severity-colored icons, messages, timestamps
- **Actions:** Mark as read, mark all read, dismiss
- **Toast notifications:** Feedback for all actions

#### Staff Management (`/dashboard/staff`)
- **Registration dialog:** First name, last name, email (`@msspaceglobal.com`), password (with visibility toggle), role, department, supervisor
- **Smart supervisor filtering:** When role is "staff" and a department is selected, the supervisor dropdown only shows supervisors in that department
- **Edit Staff dialog:** Super admin can change a staff member's role (staff ↔ supervisor), department, and supervisor assignment
- **Summary cards:** Total staff, active, inactive, supervisors
- **Search & filter:** By name/email, department filter
- **Staff table:** Name, email, department, role badge, status badge, join date, dropdown with Edit Staff action
- **Sheet sidebar:** Full staff profile with performance metrics, department, supervisor info, last login, Edit Staff button
- **Dropdown actions:** View profile, edit staff, deactivate/reactivate, delete user
- **AlertDialog:** Confirm deactivation/reactivation and deletion
- **Toast notifications:** All CRUD and status operations
- **Component architecture:** All dialogs, table, sheet extracted to `_components/` subdirectory

#### Departments (`/dashboard/departments`)
- **Summary cards:** Total departments, total staff, active tasks, average completion rate
- **Create dialog:** Name, description, department head (supervisor selector)
- **Department cards:** Color-coded icons, head name, staff count, active tasks, completion rate progress bar
- **View Details sheet:** Full department info — description, head with avatar, stats grid (staff, active tasks, completed, total), completion rate bar, full staff list with role badges
- **Dropdown actions:** View details, edit department, delete department
- **Edit Sheet:** Slide-over form to update name, description, and head (filtered to supervisors in this department)
- **AlertDialog:** Delete confirmation (blocks if staff assigned)
- **Toast notifications:** All CRUD operations
- **Component architecture:** All dialogs, cards, sheets extracted to `_components/` subdirectory

#### Supervisors (`/dashboard/supervisors`)
- **Summary cards:** Supervisor count, total team members, active tasks, overdue alerts
- **Supervisor cards:** Avatar, email, department, team stats (size/tasks/overdue), team member badges
- **View Team Sheet:** Full team member list with status badges, contact info
- **Selective Reassign Dialog:** Checkbox list to select individual team members (or select all), target supervisor filtered to same department only
- **Toast notifications:** Reassign feedback
- **Component architecture:** Card, TeamSheet, ReassignDialog extracted to `_components/` subdirectory

#### Change Password
- Accessible from the user menu in the sidebar footer (all roles)
- Three-field dialog: current password, new password, confirm new password
- Show/hide toggle on each field
- Client-side validation: all fields required, minimum 8 characters, passwords match, new ≠ current
- Calls `PUT /api/auth/change-password` with `{ currentPassword, newPassword }`
- Resets all fields and closes on success

#### Complaints (`/dashboard/complaints`)
- **All roles** can submit complaints/issues (bugs, errors, suggestions, complaints, other)
- **Create dialog:** Title, description, category (bug/complaint/suggestion/error/other), priority (high/medium/low), and an optional **"Direct to"** multi-select user picker to target specific users
- **Targeted users:** Complaints can be directed at one or more users; targeted users receive in-app notifications and email alerts. Submitters cannot target themselves
- **Summary cards:** Total, Open, In Review, Overlooked, Resolved, Dismissed
- **2-Hour Auto-Overlooked Timer:** Unresolved complaints (status `open` or `in_review`) feature a 2-hour countdown timer. If 2 hours pass without action, the complaint is automatically flagged as `overlooked` by a background cron job. A live-updating countdown timer is displayed on cards and the detail sheet.
- **Search & filter:** By title/description, status, category
- **Complaint cards:** Submitter avatar, title, date, category/priority/status badges, description preview, targeted user avatars
- **Detail Sheet:** Full complaint info — submitter, **directed-to users**, description, resolution (if resolved), action buttons for admin
- **Status management (admin only):** Mark as In Review, Resolve, or Dismiss; optional resolution note
- **Delete:** Admins can delete any complaint; staff/supervisors can only delete their own open complaints
- **Notifications:** Targeted users + admins receive notifications when complaints are submitted; submitters + targeted users receive notifications when status changes
- **Visibility:** Staff can see complaints they submitted **and** complaints directed at them; supervisors see their team's complaints + complaints directed at them
- **Toast notifications:** All CRUD and status operations

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/login` | — | — | Login with email & password |
| GET | `/api/auth/me` | ✅ | Any | Get current user profile |
| PUT | `/api/auth/change-password` | ✅ | Any | Change own password (requires current password) |
| PUT | `/api/auth/profile` | ✅ | Any | Update own display name |

### Users

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/users` | ✅ | Any | List all users (filter: role, department, status; staff cannot view performance records) |
| GET | `/api/users/supervisors` | ✅ | Any | List active supervisors with team members |
| GET | `/api/users/:id` | ✅ | Any | Get user by ID with associations |
| GET | `/api/users/:id/team` | ✅ | Admin/Supervisor | Get supervisor's team members |
| POST | `/api/users` | ✅ | Admin | Create new user (staff/supervisor) |
| PUT | `/api/users/:id` | ✅ | Admin | Update user details |
| PATCH | `/api/users/:id/status` | ✅ | Admin | Toggle active/inactive status |
| PATCH | `/api/users/:id/reassign-team` | ✅ | Admin | Reassign team members to new supervisor (optional `memberIds` for selective reassignment) |
| DELETE | `/api/users/:id` | ✅ | Admin | Delete user (must have no active tasks) |

### Departments

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/departments` | ✅ | Any | List all departments with stats |
| GET | `/api/departments/:id` | ✅ | Any | Get department with staff and tasks |
| POST | `/api/departments` | ✅ | Admin | Create department |
| PUT | `/api/departments/:id` | ✅ | Admin | Update department (name, description, head) |
| DELETE | `/api/departments/:id` | ✅ | Admin | Delete department (must have no staff) |

### Tasks

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/tasks` | ✅ | Any (filtered) | List tasks (filter: status, priority, department, assignee) |
| GET | `/api/tasks/stats` | ✅ | Any | Get task statistics (counts, completion rate) |
| GET | `/api/tasks/:id` | ✅ | Any | Get task by ID |
| POST | `/api/tasks` | ✅ | Admin/Supervisor | Create and assign task |
| PUT | `/api/tasks/:id` | ✅ | Admin/Supervisor | Update task details |
| PATCH | `/api/tasks/:id/status` | ✅ | Any | Update task status (triggers performance recalculation) |
| DELETE | `/api/tasks/:id` | ✅ | Admin | Delete task |

### Sub-tasks

Nested under `/api/tasks/:taskId/subtasks`.

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/tasks/:taskId/subtasks` | ✅ | Any (access-checked) | List sub-tasks ordered by `order` field |
| POST | `/api/tasks/:taskId/subtasks` | ✅ | Admin/Supervisor | Add a sub-task |
| PUT | `/api/tasks/:taskId/subtasks/reorder` | ✅ | Admin/Supervisor | Reorder sub-tasks (`{ orderedIds: string[] }`) |
| PATCH | `/api/tasks/:taskId/subtasks/:id` | ✅ | Any | Toggle `isCompleted`; only admin/supervisor can rename |
| DELETE | `/api/tasks/:taskId/subtasks/:id` | ✅ | Admin/Supervisor | Delete a sub-task |

### Task Comments

Nested under `/api/tasks/:taskId/comments`.

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/tasks/:taskId/comments` | ✅ | Any (access-checked) | List top-level comments with nested replies and author info |
| POST | `/api/tasks/:taskId/comments` | ✅ | Any (access-checked) | Post a comment; optional `parentCommentId` for replies |
| DELETE | `/api/tasks/:taskId/comments/:id` | ✅ | Any | Delete own comment; super_admin can delete any |

### Targets

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/targets` | ✅ | Any | List targets (filter: type, status, department; staff see own + dept team) |
| POST | `/api/targets` | ✅ | Admin/Supervisor | Create target |
| PUT | `/api/targets/:id` | ✅ | Admin/Supervisor | Update target |
| PATCH | `/api/targets/:id/progress` | ✅ | Any | Update target progress (legacy, creates entry internally) |
| GET | `/api/targets/:id/entries` | ✅ | Any (access-checked) | List progress entries for a target |
| POST | `/api/targets/:id/entries` | ✅ | Any (access-checked) | Add a progress entry |
| DELETE | `/api/targets/:id/entries/:entryId` | ✅ | Admin/Supervisor | Delete a progress entry |

### Performance

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/performance` | ✅ | Admin/Supervisor | List all performance records |
| GET | `/api/performance/me` | ✅ | Any | Get own performance |
| GET | `/api/performance/department/:id` | ✅ | Admin/Supervisor | Get department performance |
| POST | `/api/performance/recalculate` | ✅ | Admin | Force recalculate all scores |

### Notifications

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/notifications` | ✅ | Any | List notifications (filter: type, isRead) |
| PATCH | `/api/notifications/:id/read` | ✅ | Any | Mark notification as read |
| PATCH | `/api/notifications/read-all` | ✅ | Any | Mark all notifications as read |
| DELETE | `/api/notifications/:id` | ✅ | Any | Delete notification |

### Complaints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/complaints` | ✅ | Any (filtered) | List complaints (filter: status, category, priority; staff see own + targeted, supervisor see team + targeted) |
| GET | `/api/complaints/stats` | ✅ | Any (filtered) | Get complaint statistics (total, open, in_review, overlooked, resolved, dismissed) |
| GET | `/api/complaints/:id` | ✅ | Any (access-checked) | Get complaint by ID |
| POST | `/api/complaints` | ✅ | Any | Submit a new complaint. Body: `{ title, description, category?, priority?, targetUserIds?: string[] }` |
| PATCH | `/api/complaints/:id/status` | ✅ | Admin | Update complaint status (open/in_review/overlooked/resolved/dismissed) with optional resolution note |
| DELETE | `/api/complaints/:id` | ✅ | Any | Submitter (open only) or Admin can delete |

---

## Database Schema

### Models

| Model | Key Fields |
|-------|------------|
| **User** | id, firstName, lastName, email, password, role (super_admin/admin/supervisor/staff), status (active/inactive), departmentId, supervisorId, lastLogin |
| **Task** | id, title, description, status (not_started/in_progress/completed/overdue/completed_late), priority (high/medium/low), deadline, completedAt, assignedToId, assignedById, departmentId |
| **SubTask** | id, title, isCompleted, order, taskId |
| **TaskComment** | id, content, taskId, userId, parentCommentId (null = top-level) |
| **Department** | id, name, description, headId |
| **Target** | id, title, type (individual/team), description, targetValue, currentValue, status (on_track/at_risk/completed/missed), deadline, assignedToId, createdById, departmentId |
| **TargetEntry** | id, value, note, targetId, userId |
| **Performance** | id, userId, tasksCompleted, tasksOnTime, tasksLate, tasksCompletedLate, totalTasksAssigned, performanceScore, rating |
| **Notification** | id, userId, title, message, type, severity (info/warning/critical/success), isRead, relatedTaskId |
| **Complaint** | id, title, description, category (bug/complaint/suggestion/error/other), priority (high/medium/low), status (open/in_review/overlooked/resolved/dismissed), resolution, resolvedAt, userId, resolvedById |
| **ComplaintTarget** | id, complaintId, userId — unique(complaintId, userId) |

### Associations

```
User → Department (belongsTo)
User → User as supervisor (belongsTo)
User → User[] as teamMembers (hasMany)
User → Performance (hasOne)
User → Tasks as assignee (hasMany)
User → Tasks as assigner (hasMany)
User → TaskComment[] as taskComments (hasMany)
Department → User as head (belongsTo)
Department → User[] as staff (hasMany)
Department → Task[] (hasMany)
Task → SubTask[] as subtasks (hasMany, onDelete CASCADE)
Task → TaskComment[] as comments (hasMany, onDelete CASCADE)
Task → Notification (hasMany via relatedTaskId)
TaskComment → TaskComment[] as replies (hasMany, self-referencing, onDelete CASCADE)
TaskComment → User as author (belongsTo)
Target → TargetEntry[] as entries (hasMany, onDelete CASCADE)
TargetEntry → Target as target (belongsTo)
TargetEntry → User as submitter (belongsTo)
Complaint → User as submitter (belongsTo)
Complaint → User as resolver (belongsTo)
Complaint ↔ User as targets (belongsToMany, through ComplaintTarget)
User → Complaint[] as complaints (hasMany)
User → Complaint[] as targetedComplaints (belongsToMany, through ComplaintTarget)
```

---

## Authentication & Authorization

- **Method:** JSON Web Tokens (JWT)
- **Token Expiry:** Configurable (default 24h)
- **Email Domain:** All users must have `@msspaceglobal.com` email
- **Password:** Minimum 8 characters, hashed with bcryptjs
- **Middleware:** `auth.js` validates JWT from `Authorization: Bearer <token>` header
- **Role Guard:** `roles.js` middleware restricts endpoints by role
- **Frontend:** `AuthContext` manages auth state; auto-redirects to login on 401
- **Change Password:** Requires the user's current password; does not send email tokens

---

## Performance Scoring

### Algorithm

Performance is recalculated **in real-time** whenever:
- A task is **created** (increments `totalTasksAssigned`)
- A task **status changes** (updates completed/on-time/late counts)
- A task is **updated** via PUT (if status or assignee changes)
- Admin clicks **"Refresh Scores"** on the Performance page
- The **cron job** runs (every 10 minutes)

```
base = 50
on_time_bonus    = (on_time_tasks / total_assigned) × 50          → up to +50
overdue_penalty  = (still_overdue_tasks / total_assigned) × 40    → up to -40
completion_bonus = (all_completed / total_assigned) × 10          → up to +10
late_completion  = (completed_late_tasks / total_assigned) × 10   → up to +10 (partial credit)
score = clamp(0, 100, base + on_time_bonus - overdue_penalty + completion_bonus + late_completion)
```

### Task Status Lifecycle

| Status | Description |
|--------|-------------|
| `not_started` | Newly created task, work not begun |
| `in_progress` | Actively being worked on |
| `completed` | Finished on time (before/on deadline) |
| `overdue` | Deadline has passed and task is not completed |
| `completed_late` | Completed after the deadline (auto-set when completing an overdue task) |

**Overdue Task Rules:**
- A task whose deadline is **today** is NOT marked overdue until the **next day**. The cron compares against midnight of today (`startOfToday`), not the current time.
- An overdue task **cannot** be set to `in_progress` (blocked by backend).
- Completing an overdue task automatically sets status to `completed_late` (not `completed`).
- `completed_late` tasks receive **partial credit** in performance scoring.

### Rating Scale

| Score | Rating |
|-------|--------|
| 90+ | Excellent |
| 75–89 | Good |
| 50–74 | Average |
| < 50 | Needs Improvement |

### Performance Metrics

| Field | Description |
|-------|-------------|
| `tasksCompleted` | Total tasks completed (on-time + late) |
| `tasksOnTime` | Tasks completed before or on deadline |
| `tasksCompletedLate` | Tasks completed after deadline (partial credit) |
| `tasksLate` | Tasks still overdue (not completed) |
| `totalTasksAssigned` | All tasks assigned to user |

---

## Notifications & Alerts

### Notification Types

| Type | Severity | Trigger |
|------|----------|---------|
| `task_assigned` | Info/Warning | Task assigned or reassigned to user |
| `task_completed` | Success/Warning | Staff completes a task (sent to supervisor; warning if late) |
| `deadline_warning` | Warning | Task deadline within 24 hours (cron) |
| `overdue_alert` | Critical | Task marked as overdue (cron) |

### Automated Jobs (Cron)

A cron job runs every 10 minutes:
1. Marks overdue tasks (`deadline < startOfToday && status not in [completed, overdue, completed_late]`)
2. Creates overdue notifications for assignees
3. Alerts supervisors of overdue tasks
4. Creates deadline warning notifications (within 24 hours)
5. Recalculates all performance scores (daily at midnight)
6. Detects and marks missed targets (every 10 minutes)

### Frontend Toast System

All user actions produce non-blocking **Sonner** toast notifications:
- **Loading → Success/Error** pattern for async operations
- **Success toasts** for creates, updates, status changes
- **Error toasts** with descriptive messages from API errors
- **AlertDialog** for destructive confirmations (delete, deactivate)

---

## Development Guide

### Frontend Development

```bash
cd frontend
npm run dev              # Dev server at http://localhost:3001
```

### Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```

> **Important:** Use the `render` prop pattern (not `asChild`) for triggers.

### Backend Development

```bash
cd task-back-end-main
npm run dev              # Dev server at http://localhost:3000
```

### Running Both Servers

```bash
# Terminal 1: Backend
cd task-back-end-main && npm start

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Database Seeding

The database is **auto-seeded** on first run if empty (creates default departments and the super admin account). Manual seeding is also available:

```bash
cd task-back-end-main
node src/seeders/seed.js
```

### Key Development Notes

1. **Select components** must use `value={stateVar || undefined}` to prevent UUID display
2. **All destructive actions** must use `AlertDialog` for confirmation
3. **All user feedback** must use `toast` from `sonner` — never `alert()`/`confirm()`
4. **Performance recalculation** is automatic on task status changes
5. **Orphaned performance records** (null userId) are auto-cleaned on fetch
6. **Nested routes** (`/api/tasks/:taskId/subtasks`, `/api/tasks/:taskId/comments`) must be registered in `server.js` **before** the main `/api/tasks` router to prevent the `/:id` handler from matching those paths
7. **Staff role API calls:** The tasks page checks `isStaff` before calling any admin-restricted endpoints. The `useEffect` waits for `authLoading` to resolve before running to ensure the correct role is available
8. **SQLite FK sync:** `server.js` runs `PRAGMA foreign_keys = OFF` before `sequelize.sync({ alter: true })` to avoid constraint errors during table recreation

---

## Deployment

### Frontend

1. Build: `npm run build`
2. Deploy to Vercel, Netlify, or any Node.js hosting
3. Set `NEXT_PUBLIC_API_URL` to production backend URL (must include `https://`)

### Backend

1. Set up PostgreSQL database
2. Configure `.env` with production credentials
3. Run `npm start`
4. Ensure `JWT_SECRET` is a strong, random string

### Environment Variables Summary

| Variable | Service | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Frontend | Backend API base URL (must include protocol: `https://`) |
| `PORT` | Backend | Server port (default: 3000) |
| `DB_DIALECT` | Backend | Database dialect (`postgres` or `sqlite`) |
| `DB_NAME` | Backend | PostgreSQL database name |
| `DB_USER` | Backend | PostgreSQL username |
| `DB_PASS` | Backend | PostgreSQL password |
| `DB_HOST` | Backend | PostgreSQL host |
| `DB_STORAGE` | Backend | SQLite file path (default: `./database.sqlite`) |
| `JWT_SECRET` | Backend | JWT signing secret |
| `NODE_ENV` | Backend | Environment (development/production) |
| `FRONTEND_URL` | Backend | CORS allowed origin |
| `RESEND_API_KEY` | Backend | Resend API key for email delivery |
| `MAIL_FROM_ADDRESS` | Backend | Sender email address (must be verified in Resend) |
| `MAIL_FROM_NAME` | Backend | Sender display name |
| `SUPER_ADMIN_EMAIL` | Backend | Auto-seeded super admin email |
| `SUPER_ADMIN_FIRST_NAME` | Backend | Auto-seeded super admin first name |
| `SUPER_ADMIN_LAST_NAME` | Backend | Auto-seeded super admin last name |
| `SUPER_ADMIN_PASSWORD` | Backend | Auto-seeded super admin password |

---

## Changelog

### v2.6.0 (June 3, 2026)

**New Features:**
- **Admin role:** Super admin can now promote users to "Admin" with full management permissions (create/delete users, assign tasks to anyone, manage departments, etc.). Admins cannot modify other admins or the super admin. Super admin can revoke admin access and demote back to supervisor or staff at any time
- **Complaints & issues system:** All users can submit complaints, bug reports, suggestions, errors, and other issues via a new dedicated page. Complaints include category, priority, and description. Admins can review, resolve, or dismiss complaints with optional resolution notes. Submitters receive notifications when their complaint status changes
- **Role badge styling:** Admin users display with a distinct red badge in the staff table, profile sheet, and comments. Super Admin badge now correctly displays "Super Admin" instead of "Admin"

**Database Changes:**
- User role ENUM now includes `admin`: `super_admin`, `admin`, `supervisor`, `staff`
- New `Complaints` table with categories, priorities, status tracking, and resolution notes
- PostgreSQL: `sequelize.sync({ alter: true })` automatically adds the new enum value and table — no manual migration needed
- SQLite: requires deleting `database.sqlite` and restarting

### v2.7.0 (June 4, 2026)

**New Features:**
- **Targeted complaints:** When submitting a complaint, users can now select one or more staff members to direct the complaint to via a searchable multi-select picker. Submitters cannot target themselves
- **Targeted user notifications:** Targeted users receive both in-app notifications and email alerts when a complaint is directed at them. Admins/super admins also continue to be notified
- **Status change notifications for targets:** When an admin resolves or dismisses a complaint, both the submitter and all targeted users receive notifications
- **Expanded visibility:** Staff can now see complaints directed at them (not just ones they submitted). Supervisors see complaints targeting them in addition to their team's complaints
- **UI enhancements:** Complaint cards show targeted user avatars with a "Directed to" label. The detail sheet includes a "Directed To" section with full user info

**Database Changes:**
- New `ComplaintTargets` join table with columns: `id`, `complaintId`, `userId` and a unique composite index on `(complaintId, userId)`
- PostgreSQL: `sequelize.sync({ alter: true })` automatically creates the new table — no manual migration needed
- SQLite: requires deleting `database.sqlite` and restarting

**Bug Fixes:**
- **Access Denied on Complaints:** Fixed staff users triggering 403 Access Denied errors on the complaints page by opening the `/api/users` endpoint to all authenticated users, while dynamically filtering out sensitive performance records for staff.

---

### v2.8.0 (June 8, 2026)

**New Features:**
- **2-Hour Auto-Overlooked Timer:** Unresolved complaints (status `open` or `in_review`) now have a default 2-hour countdown timer. If a complaint is not resolved or dismissed within 2 hours of its creation, its status is automatically updated to `overlooked` by a background cron job.
- **Overlooked Status & UI:** Added a new `overlooked` status with color-coded styling. Added a live-updating countdown timer on complaint cards and the detail sheet. Added an "Overlooked" card to the complaints page stats summary grid.

**Database Changes:**
- Updated the Complaint status ENUM to include `overlooked`: `'open'`, `'in_review'`, `'resolved'`, `'dismissed'`, `'overlooked'`.
- PostgreSQL: `sequelize.sync({ alter: true })` automatically alters the ENUM type definition.
- SQLite: requires deleting `database.sqlite` and restarting.

---

### v2.9.0 (June 8, 2026)

**New Features:**
- **Task grouping by month:** Tasks are now grouped by the month they were created in. A new month selector dropdown (with a calendar icon) appears in the filters bar. The current month is selected by default — past months are accessible via the dropdown. An "All Months" option shows every task at once. This prevents task list congestion as tasks accumulate over time.
- **Overlooked complaint notifications & emails:** When the 5-minute cron job marks a complaint as `overlooked`, it now sends in-app notifications and email alerts to the complaint submitter, all targeted users, and admins/super admins. Previously the cron job only updated the status silently.

**Bug Fixes:**
- **Countdown timer performance fix:** Fixed a critical performance issue where the `ComplaintCountdown` timer component caused UI lag after expiry. The root cause was `setInterval` running indefinitely even after the countdown reached zero, triggering a React state update every second on every expired complaint. The timer now clears its interval the instant it expires and skips starting an interval entirely for already-expired complaints.

---

### v2.5.1 (May 4, 2026)

**Infrastructure:**
- **Email delivery migrated from SMTP to Resend API:** Replaced `nodemailer` SMTP transport with the [Resend](https://resend.com) HTTP API (`resend` SDK). This resolves email "Connection timeout" failures on Render, where outbound SMTP connections on ports 465/587 are blocked. Resend uses HTTPS which is not affected by these restrictions
- **CID image handling:** Logo images previously embedded via CID are now inlined as base64 data URIs for broader email client compatibility with Resend
- **Environment variables updated:** Replaced `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION` with a single `RESEND_API_KEY`

### v2.5.0 (May 1, 2026)

**New Features:**
- **Target progress entries:** Assigned members can now log numeric achievements (entries) against targets. Each entry records who submitted, the value, an optional note, and a timestamp. Progress (`currentValue`) is computed as the sum of all entries
- **Target detail sheet:** Clickable target cards open a slide-over panel showing full target info, progress bar, deadline countdown, add-entry form, and a chronological entries timeline
- **Expanded target visibility:** Staff now see their own individual targets AND team targets for their department
- **Missed target detection:** Automated cron job marks targets as `missed` when the deadline passes and the goal hasn't been met. Notifications are sent to assignees and creators
- **Target filter tabs:** All / On Track / At Risk / Missed / Completed filter buttons on the targets page
- **Deadline countdown:** Each target card shows days remaining or days overdue with color-coded indicators
- **Entry deletion:** Admin and supervisors can delete progress entries (with AlertDialog confirmation), which recalculates the target's progress

### v2.4.0 (April 28, 2026)

**New Features:**
- **Supervisor self-assignment:** Supervisors can now assign tasks to themselves via the "Assign To" dropdown in both create and edit task dialogs
- **Target editing:** Admin and supervisors can edit existing targets (title, description, type, department, assignee, goal, deadline) via a dropdown menu on each target card

---

### v2.3.0 (April 18, 2026)

**New Features:**
- **Sub-tasks:** Checklist items per task with completion tracking, progress bar, add/reorder/delete (admin/supervisor), and check/uncheck (all roles). Can be drafted during task creation
- **Task Comments:** Threaded comments with replies on task details sheet. All roles can post and reply. Authors and super admins can delete comments
- **Change Password:** Secure password change dialog (current password required) accessible from the sidebar user menu for all roles

**Bug Fixes:**
- Fixed staff users triggering 403 errors by calling admin-restricted `/api/users` and `/api/departments` endpoints on page load. Staff now takes a dedicated early-return code path that skips those calls entirely
- Fixed tasks with a deadline of "today" being marked overdue immediately. The overdue cron now compares against midnight (`startOfToday`) instead of the current timestamp, so a task is only overdue the day after its deadline
- Fixed `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed` error during server startup. Sequelize's `alter: true` sync now runs with `PRAGMA foreign_keys = OFF` (SQLite only) to allow table recreation without constraint violations
- Fixed default theme: `ThemeProvider` now uses `defaultTheme="system"` so the app respects OS dark/light preference on first load
- Fixed login "Failed to fetch" with no network activity: `.env.local` must include the `http://` protocol prefix in `NEXT_PUBLIC_API_URL`

### v2.0.0 (April 10, 2026)

**UI/UX Overhaul:**
- Replaced all `alert()` and `confirm()` calls with shadcn AlertDialog and Sonner toast
- Added Sheet sidebar for task details, staff profiles, team management, and department editing
- Added Dialog for team reassignment between supervisors
- Added toast loading states for all async operations

**Backend Additions:**
- `DELETE /api/users/:id` — Delete users with active task validation
- `PATCH /api/users/:id/reassign-team` — Bulk reassign team members
- `POST /api/performance/recalculate` — Admin endpoint to force score refresh
- Real-time performance recalculation on task create, update, and status change
- Auto-cleanup of orphaned performance records (null userId)

**Bug Fixes:**
- Fixed Select dropdowns showing UUID instead of display name
- Fixed performance scores not updating when tasks are completed
- Fixed unknown/null user appearing in performance table

---

*Maintained by the Msspaceglobal Development Team.*
