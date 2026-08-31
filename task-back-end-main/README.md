# TaskManager Pro — Backend API Specification

> **Project:** MSSpace Global Task Management System
> **Version:** 1.2.0
> **Base URL:** `http://localhost:3000`
> **Last Updated:** April 13, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Setup & Installation](#setup--installation)
5. [Environment Configuration](#environment-configuration)
6. [Database Models](#database-models)
7. [API Endpoints](#api-endpoints)
8. [Authentication & Authorization](#authentication--authorization)
9. [Business Rules](#business-rules)
10. [Cron Jobs & Automation](#cron-jobs--automation)
11. [Performance Scoring Algorithm](#performance-scoring-algorithm)
12. [Notification System](#notification-system)
13. [Error Handling](#error-handling)
14. [Switching to PostgreSQL](#switching-to-postgresql)

---

## Overview

TaskManager Pro is a team performance and task management API built for **MSSpace Global**. It provides:

- **No public signup** — all users are created by the super admin
- **Role-based access control** (super_admin, supervisor, staff)
- **Company email enforcement** — all accounts must use `@msspaceglobal.com`
- **Automated overdue detection** and supervisor alerts
- **Deadline reminders** sent 24 hours before due
- **Performance scoring** with auto-calculated ratings
- **Department & team organization**

### Super Admin

| Field | Value |
|-------|-------|
| **Email** | `----@msspaceglobal.com` |
| **Name** | Feyisara Ogunranti |
| **Default Password** | ---- |
| **Role** | `super_admin` |

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.x | Runtime |
| Express.js | 4.19 | Web framework |
| Sequelize | 6.37 | ORM |
| SQLite | 5.1 | Database (default, local dev) |
| PostgreSQL | 8.x | Database (production, optional) |
| JWT | 9.x | Authentication tokens |
| bcryptjs | 2.4 | Password hashing |
| node-cron | 3.x | Scheduled jobs |
| Winston | 3.x | Logging |
| Morgan | 1.x | HTTP request logging |
| CORS | 2.8 | Cross-origin requests |

---

## Project Structure

```
task-back-end-main/
├── server.js                         # Express app entry point
├── package.json
├── .env                              # Environment variables
├── .env.example                      # Template for env vars
├── database.sqlite                   # SQLite database file (auto-created)
└── src/
    ├── config/
    │   └── database.js               # Sequelize instance (SQLite/PostgreSQL)
    ├── models/
    │   ├── index.js                  # Model registry + associations
    │   ├── User.js                   # User model
    │   ├── Department.js             # Department model
    │   ├── Task.js                   # Task model
    │   ├── Target.js                 # Target model
    │   ├── Performance.js            # Performance model
    │   └── Notification.js           # Notification model
    ├── controllers/
    │   ├── auth.controller.js        # Login, profile, change password
    │   ├── user.controller.js        # User CRUD (admin only)
    │   ├── department.controller.js  # Department CRUD
    │   ├── task.controller.js        # Task CRUD + stats
    │   ├── target.controller.js      # Target CRUD + progress
    │   ├── performance.controller.js # Performance queries
    │   └── notification.controller.js# Notification management
    ├── routes/
    │   ├── auth.routes.js
    │   ├── user.routes.js
    │   ├── department.routes.js
    │   ├── task.routes.js
    │   ├── target.routes.js
    │   ├── performance.routes.js
    │   └── notification.routes.js
    ├── middlewares/
    │   ├── auth.js                   # JWT token verification
    │   └── roles.js                  # Role-based access control
    ├── services/
    │   └── performance.service.js    # Score calculation engine
    ├── jobs/
    │   └── cron.js                   # Scheduled automation
    ├── seeders/
    │   └── seed.js                   # Super admin + default departments
    └── utils/
        ├── logger.js                 # Winston logger
        └── jwt.js                    # Token sign/verify helpers
```

---

## Setup & Installation

```bash
# Navigate to backend
cd task-back-end-main

# Install dependencies
npm install

# Seed the database (creates super admin + 6 departments)
npm run seed

# Start in development mode
npm run dev

# Start in production mode
npm start
```

The server will start on `http://localhost:3000` by default.

---

## Environment Configuration

```env
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=msspace-taskmanager-secret-key-2026

# Database — SQLite (default for local development)
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite

# Database — PostgreSQL (uncomment to switch)
# DB_DIALECT=postgres
# DB_NAME=taskmanager_db
# DB_USER=postgres
# DB_PASS=yourpassword
# DB_HOST=localhost
# DB_PORT=5432

# Super Admin Seed
SUPER_ADMIN_EMAIL=f.ogunranti@msspaceglobal.com
SUPER_ADMIN_FIRST_NAME=Femi
SUPER_ADMIN_LAST_NAME=Ogunranti
SUPER_ADMIN_PASSWORD=MSSpace@2026!

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3001
```

---

## Database Models

### User

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID (PK) | Auto-generated | Primary key |
| `firstName` | STRING | Required | First name |
| `lastName` | STRING | Required | Last name |
| `email` | STRING | Unique, must end with `@msspaceglobal.com` | Login email |
| `password` | STRING | Required, bcrypt-hashed (12 rounds) | Password |
| `role` | ENUM | `super_admin`, `supervisor`, `staff` | User role |
| `status` | ENUM | `active`, `inactive` (default: `active`) | Account status |
| `lastLogin` | DATE | Nullable | Last login timestamp |
| `departmentId` | UUID (FK) | References Department | Assigned department |
| `supervisorId` | UUID (FK) | Self-referencing, references User | Assigned supervisor |

**Hooks:** Password is automatically hashed on create and update via bcrypt.
**Instance Methods:**
- `comparePassword(candidate)` — Compares a plaintext password against the hash.
- `toSafeJSON()` — Returns user data without the password field.

### Department

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID (PK) | Auto-generated | Primary key |
| `name` | STRING | Unique, Required | Department name |
| `description` | TEXT | Nullable | Description |
| `headId` | UUID (FK) | References User | Department head |

**Default departments (seeded):** Engineering, Marketing, Sales, Finance, Human Resources, Operations.

### Task

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID (PK) | Auto-generated | Primary key |
| `title` | STRING | Required | Task title |
| `description` | TEXT | Nullable | Task details |
| `status` | ENUM | `not_started`, `in_progress`, `completed`, `overdue`, `completed_late` | Current status |
| `priority` | ENUM | `high`, `medium`, `low` (default: `medium`) | Priority level |
| `deadline` | DATE | Required | Due date |
| `completedAt` | DATE | Nullable | Completion timestamp |
| `assignedToId` | UUID (FK) | References User | Assigned staff member |
| `assignedById` | UUID (FK) | References User | Created by (admin/supervisor) |
| `departmentId` | UUID (FK) | References Department | Department |

### Target

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID (PK) | Auto-generated | Primary key |
| `title` | STRING | Required | Target name |
| `type` | ENUM | `individual`, `team` | Target scope |
| `description` | TEXT | Nullable | Details |
| `targetValue` | INTEGER | Default: 100 | Goal number |
| `currentValue` | INTEGER | Default: 0 | Current progress |
| `status` | ENUM | `on_track`, `at_risk`, `completed`, `missed` | Progress state |
| `deadline` | DATE | Required | Due date |
| `assignedToId` | UUID (FK) | References User | For individual targets |
| `createdById` | UUID (FK) | References User | Creator |
| `departmentId` | UUID (FK) | References Department | For team targets |

### Performance

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID (PK) | Auto-generated | Primary key |
| `tasksCompleted` | INTEGER | Default: 0 | Total completed tasks (on-time + late) |
| `tasksOnTime` | INTEGER | Default: 0 | Completed before deadline |
| `tasksLate` | INTEGER | Default: 0 | Tasks still overdue (not completed) |
| `tasksCompletedLate` | INTEGER | Default: 0 | Completed after deadline (partial credit) |
| `totalTasksAssigned` | INTEGER | Default: 0 | Total tasks assigned |
| `performanceScore` | FLOAT | Default: 0 | Calculated score (0–100) |
| `rating` | ENUM | `excellent`, `good`, `average`, `needs_improvement` | Rating category |
| `period` | STRING | Nullable | Time period (e.g., `2026-Q2`) |
| `userId` | UUID (FK) | References User | One-to-one with User |

### Notification

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID (PK) | Auto-generated | Primary key |
| `title` | STRING | Required | Notification title |
| `message` | TEXT | Required | Full message body |
| `type` | ENUM | `deadline_warning`, `overdue_alert`, `task_completed`, `task_assigned`, `performance_update`, `general` | Notification type |
| `severity` | ENUM | `info`, `warning`, `critical`, `success` | Visual severity |
| `isRead` | BOOLEAN | Default: `false` | Read status |
| `userId` | UUID (FK) | References User | Recipient |
| `relatedTaskId` | UUID (FK) | References Task (nullable) | Linked task |

### Model Associations

```
User belongsTo Department (departmentId)
User belongsTo User as "supervisor" (supervisorId)
User hasMany User as "teamMembers" (supervisorId)
User hasMany Task as "assignedTasks" (assignedToId)
User hasMany Task as "createdTasks" (assignedById)
User hasOne Performance (userId)
User hasMany Notification (userId)

Department hasMany User as "staff" (departmentId)
Department hasMany Task as "tasks" (departmentId)
Department belongsTo User as "head" (headId)

Task belongsTo User as "assignee" (assignedToId)
Task belongsTo User as "assigner" (assignedById)
Task belongsTo Department (departmentId)

Target belongsTo User as "assignee" (assignedToId)
Target belongsTo User as "creator" (createdById)
Target belongsTo Department (departmentId)

Performance belongsTo User (userId)

Notification belongsTo User as "recipient" (userId)
Notification belongsTo Task as "relatedTask" (relatedTaskId)
```

---

## API Endpoints

### Authentication

> **No signup route exists.** All users are created by the super admin via `POST /api/users`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | No | Login with email + password |
| `GET` | `/api/auth/me` | Yes | Get current user profile |
| `PUT` | `/api/auth/change-password` | Yes | Change own password |

#### POST `/api/auth/login`

**Request:**
```json
{
  "email": "f.ogunranti@msspaceglobal.com",
  "password": "MSSpace@2026!"
}
```

**Response (200):**
```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "firstName": "Femi",
    "lastName": "Ogunranti",
    "email": "f.ogunranti@msspaceglobal.com",
    "role": "super_admin",
    "status": "active",
    "lastLogin": "2026-04-10T12:03:36.591Z",
    "department": null
  }
}
```

#### PUT `/api/auth/change-password`

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

### Users

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/users` | Yes | Admin, Supervisor | List all users |
| `GET` | `/api/users/supervisors` | Yes | Any | List supervisors |
| `GET` | `/api/users/:id` | Yes | Any | Get user by ID |
| `GET` | `/api/users/:id/team` | Yes | Admin, Supervisor | Get team members |
| `POST` | `/api/users` | Yes | Admin only | Create user |
| `PUT` | `/api/users/:id` | Yes | Admin only | Update user (role, department, supervisor) |
| `PATCH` | `/api/users/:id/status` | Yes | Admin only | Activate/deactivate |
| `PATCH` | `/api/users/:id/reassign-team` | Yes | Admin only | Reassign team members (selective or all) |
| `DELETE` | `/api/users/:id` | Yes | Admin only | Delete user (no active tasks) |

#### POST `/api/users` (Create User)

**Request:**
```json
{
  "firstName": "Alice",
  "lastName": "Morgan",
  "email": "a.morgan@msspaceglobal.com",
  "password": "MSSpace@2026!",
  "role": "staff",
  "departmentId": "uuid",
  "supervisorId": "uuid"
}
```

**Validations:**
- Email must end with `@msspaceglobal.com`
- Password must be at least 8 characters
- Role can only be `staff` or `supervisor` (not `super_admin`)
- Department must exist if provided
- Supervisor must have `supervisor` or `super_admin` role

**Query Filters (GET /api/users):**
- `?role=staff|supervisor|super_admin`
- `?departmentId=uuid`
- `?status=active|inactive`

#### PATCH `/api/users/:id/reassign-team` (Reassign Team Members)

**Request:**
```json
{
  "newSupervisorId": "uuid",
  "memberIds": ["uuid1", "uuid2"]  // optional — omit to reassign ALL
}
```

**Response:**
```json
{
  "message": "2 team member(s) reassigned to Jane Smith.",
  "reassignedCount": 2
}
```

**Rules:**
- `newSupervisorId` is required and must be a user with `supervisor` or `super_admin` role
- If `memberIds` is provided, only those specific members are reassigned
- If `memberIds` is omitted, all team members of the supervisor are reassigned
- Frontend enforces that the target supervisor must be in the same department

---

### Departments

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/departments` | Yes | Any | List all (with stats) |
| `GET` | `/api/departments/:id` | Yes | Any | Get department details |
| `POST` | `/api/departments` | Yes | Admin only | Create department |
| `PUT` | `/api/departments/:id` | Yes | Admin only | Update department |
| `DELETE` | `/api/departments/:id` | Yes | Admin only | Delete department |

**GET Response includes computed stats:**
```json
{
  "departments": [{
    "id": "uuid",
    "name": "Engineering",
    "description": "...",
    "head": { "id": "uuid", "firstName": "Sarah", "lastName": "Chen" },
    "staff": [...],
    "staffCount": 12,
    "activeTasks": 28,
    "completedTasks": 14,
    "totalTasks": 42,
    "completionRate": 83
  }]
}
```

**Delete Rule:** Cannot delete a department that still has staff assigned. Reassign staff first.

---

### Tasks

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/tasks` | Yes | Any (filtered) | List tasks |
| `GET` | `/api/tasks/stats` | Yes | Any | Dashboard statistics |
| `GET` | `/api/tasks/:id` | Yes | Any | Get task details |
| `POST` | `/api/tasks` | Yes | Admin, Supervisor | Create & assign task |
| `PUT` | `/api/tasks/:id` | Yes | Admin, Supervisor | Update task |
| `PATCH` | `/api/tasks/:id/status` | Yes | Any | Change task status |
| `DELETE` | `/api/tasks/:id` | Yes | Admin only | Delete task |

#### Role-Based Task Visibility

| Role | Sees |
|------|------|
| `staff` | Only their own assigned tasks |
| `supervisor` | Their team's tasks + tasks they assigned |
| `super_admin` | All tasks |

#### POST `/api/tasks` (Create Task)

**Request:**
```json
{
  "title": "Complete Q2 Report",
  "description": "Prepare quarterly report for Q2",
  "priority": "high",
  "deadline": "2026-04-15",
  "assignedToId": "uuid",
  "departmentId": "uuid"
}
```

**Supervisor Rule:** Supervisors can only assign tasks to their own team members.

**Auto-actions on task creation:**
- A `task_assigned` notification is created for the assignee

**Auto-actions on status change to `completed`:**
- If task was `overdue`, status is automatically set to `completed_late` instead
- `completedAt` is set to current timestamp
- A `task_completed` notification is sent to the supervisor (marked as warning if late)

**Overdue Task Restrictions:**
- An overdue task **cannot** be set to `in_progress` (returns 400 error)
- Completing an overdue task auto-sets status to `completed_late`
- `completed_late` tasks receive partial credit in performance scoring

#### GET `/api/tasks/stats`

```json
{
  "stats": {
    "total": 247,
    "completed": 189,
    "inProgress": 43,
    "overdue": 15,
    "notStarted": 0,
    "completedLate": 8,
    "completionRate": 80
  }
}
```

**Query Filters (GET /api/tasks):**
- `?status=not_started|in_progress|completed|overdue|completed_late`
- `?priority=high|medium|low`
- `?departmentId=uuid`
- `?assignedToId=uuid` (admin only)

---

### Targets

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/targets` | Yes | Any (filtered) | List targets |
| `POST` | `/api/targets` | Yes | Admin, Supervisor | Create target |
| `PUT` | `/api/targets/:id` | Yes | Admin, Supervisor | Update target |
| `PATCH` | `/api/targets/:id/progress` | Yes | Any | Update progress |

**Progress Update:** Auto-calculates status:
- `currentValue >= targetValue` → `completed`
- `currentValue >= 70% of targetValue` → `on_track`
- Otherwise → `at_risk`

---

### Performance

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/performance` | Yes | Admin, Supervisor | All performance records |
| `GET` | `/api/performance/me` | Yes | Any | Own performance |
| `GET` | `/api/performance/department/:id` | Yes | Admin, Supervisor | Department performance |

---

### Notifications

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/notifications` | Yes | Any | List own notifications |
| `PATCH` | `/api/notifications/read-all` | Yes | Any | Mark all as read |
| `PATCH` | `/api/notifications/:id/read` | Yes | Any | Mark one as read |
| `DELETE` | `/api/notifications/:id` | Yes | Any | Dismiss notification |

**GET Response:**
```json
{
  "notifications": [...],
  "unreadCount": 5
}
```

**Query Filters:**
- `?type=deadline_warning|overdue_alert|task_completed|task_assigned|performance_update|general`
- `?isRead=true|false`

---

## Authentication & Authorization

### JWT Token

- **Algorithm:** HS256
- **Expiry:** 24 hours
- **Payload:** `{ id, email, role }`
- **Header format:** `Authorization: Bearer <token>`

### Roles & Permissions Matrix

| Resource | Action | `super_admin` | `supervisor` | `staff` |
|----------|--------|:---:|:---:|:---:|
| **Users** | Create | ✅ | ❌ | ❌ |
| **Users** | Update | ✅ | ❌ | ❌ |
| **Users** | Activate/Deactivate | ✅ | ❌ | ❌ |
| **Users** | List all | ✅ | ✅ | ❌ |
| **Users** | View | ✅ | ✅ | ✅ (self) |
| **Departments** | Create/Edit/Delete | ✅ | ❌ | ❌ |
| **Departments** | View | ✅ | ✅ | ✅ |
| **Tasks** | Create/Assign | ✅ | ✅ (own team) | ❌ |
| **Tasks** | Update | ✅ | ✅ (own team) | ❌ |
| **Tasks** | Change Status | ✅ | ✅ | ✅ (own tasks) |
| **Tasks** | Delete | ✅ | ❌ | ❌ |
| **Tasks** | View | ✅ (all) | ✅ (team) | ✅ (own) |
| **Targets** | Create/Edit | ✅ | ✅ | ❌ |
| **Targets** | Update Progress | ✅ | ✅ | ✅ |
| **Performance** | View All | ✅ | ✅ (team) | ❌ |
| **Performance** | View Own | ✅ | ✅ | ✅ |
| **Notifications** | Manage Own | ✅ | ✅ | ✅ |

---

## Business Rules

1. **No public registration.** Every user is created by the super admin.
2. **Email domain enforcement.** All emails must end with `@msspaceglobal.com`.
3. **Supervisor assignment.** Supervisors can only assign/edit tasks for their own team members (users with `supervisorId` pointing to them).
4. **Supervisor task editing.** Supervisors can edit tasks they assigned or tasks assigned to their team members.
5. **Super admin protection.** The super admin account cannot be deactivated or have its role changed by anyone else.
6. **Department deletion.** A department with staff assigned cannot be deleted. Staff must be reassigned first.
7. **Task completion.** When a task status is changed to `completed`, the `completedAt` field is auto-set and the supervisor is notified.
8. **Late completion.** When an overdue task is completed, the status is set to `completed_late` instead of `completed`. Partial performance credit is given.
9. **Overdue task restrictions.** An overdue task cannot be moved to `in_progress`. It can only be completed (as `completed_late`).
10. **Overdue auto-detection.** Tasks past their deadline are automatically marked as `overdue` by the cron job (excludes `completed` and `completed_late`).
11. **Performance auto-calculation.** All scores are recalculated in real-time and via daily cron.

---

## Cron Jobs & Automation

| Schedule | Job | Description |
|----------|-----|-------------|
| Every 10 minutes | **Overdue Detection** | Finds tasks past deadline, marks as `overdue`, creates `critical` notifications for assignee and supervisor |
| Every hour | **Deadline Warning** | Finds tasks due in next 24 hours, creates `warning` notifications (with dedup to prevent spam) |
| Daily at midnight | **Performance Recalculation** | Recalculates all user performance scores based on task data |

---

## Performance Scoring Algorithm

```
Base Score = 50

On-Time Bonus        = (tasks_on_time / total_assigned) × 50       → up to +50
Overdue Penalty      = (still_overdue / total_assigned) × 40       → up to -40
Completion Bonus     = (all_completed / total_assigned) × 10       → up to +10
Late Completion      = (completed_late / total_assigned) × 10      → up to +10 (partial credit)

Final Score = clamp(Base + On-Time Bonus - Overdue Penalty + Completion Bonus + Late Completion, 0, 100)
```

**Key Distinction:**
- `tasks_on_time` → completed before/on deadline → **full credit**
- `completed_late` → completed after deadline → **partial credit** (+10 ratio, not +50)
- `still_overdue` → past deadline, not completed → **penalty** (-40 ratio)

### Rating Scale

| Score Range | Rating |
|-------------|--------|
| 90–100 | `excellent` |
| 75–89 | `good` |
| 50–74 | `average` |
| 0–49 | `needs_improvement` |

---

## Notification System

### Notification Types

| Type | Severity | Trigger |
|------|----------|---------|
| `task_assigned` | `info` / `warning` (if high priority) | Admin/supervisor creates a task |
| `deadline_warning` | `warning` | Task due within 24 hours (cron) |
| `overdue_alert` | `critical` | Task past deadline (cron) |
| `task_completed` | `success` | Staff marks task as completed |
| `performance_update` | `info` | Performance score recalculated |
| `general` | `info` | Manual system notifications |

### Who Gets Notified

| Event | Assignee | Supervisor |
|-------|:---:|:---:|
| Task assigned | ✅ | — |
| Task reassigned | ✅ (new assignee) | — |
| Deadline approaching | ✅ | ✅ |
| Task overdue | ✅ | ✅ |
| Task completed (on time) | — | ✅ (success) |
| Task completed (late) | — | ✅ (warning) |

---

## Error Handling

All errors return a consistent JSON format:

```json
{
  "error": "Human-readable error message."
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request (validation error) |
| `401` | Unauthorized (no/invalid token) |
| `403` | Forbidden (insufficient role) |
| `404` | Resource not found |
| `409` | Conflict (duplicate resource) |
| `500` | Internal server error |

---

## Switching to PostgreSQL

To switch from SQLite to PostgreSQL:

1. Install PostgreSQL and create a database:
   ```sql
   CREATE DATABASE taskmanager_db;
   ```

2. Update `.env`:
   ```env
   # Comment out SQLite
   # DB_DIALECT=sqlite
   # DB_STORAGE=./database.sqlite

   # Uncomment PostgreSQL
   DB_DIALECT=postgres
   DB_NAME=taskmanager_db
   DB_USER=postgres
   DB_PASS=yourpassword
   DB_HOST=localhost
   DB_PORT=5432
   ```

3. Ensure `pg` and `pg-hstore` are installed:
   ```bash
   npm install pg pg-hstore
   ```

4. Re-run the seeder:
   ```bash
   npm run seed
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

The application code requires **zero changes** — only the `.env` file needs to be updated.

---

*TaskManager Pro Backend — MSSpace Global © 2026*
