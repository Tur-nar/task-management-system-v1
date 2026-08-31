const sequelize = require('../config/database');
const User = require('./User');
const Department = require('./Department');
const Task = require('./Task');
const Target = require('./Target');
const TargetEntry = require('./TargetEntry');
const Performance = require('./Performance');
const Notification = require('./Notification');
const SubTask = require('./SubTask');
const TaskComment = require('./TaskComment');
const Complaint = require('./Complaint');
const ComplaintTarget = require('./ComplaintTarget');

// ──────────────────────────────────────────────
// Department ↔ User
// ──────────────────────────────────────────────
Department.hasMany(User, { foreignKey: 'departmentId', as: 'staff' });
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Department head (a user who leads the dept)
Department.belongsTo(User, { foreignKey: 'headId', as: 'head', constraints: false });

// ──────────────────────────────────────────────
// User ↔ User (Supervisor → Staff)
// ──────────────────────────────────────────────
User.belongsTo(User, { foreignKey: 'supervisorId', as: 'supervisor' });
User.hasMany(User, { foreignKey: 'supervisorId', as: 'teamMembers' });

// ──────────────────────────────────────────────
// Task associations
// ──────────────────────────────────────────────
Task.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignee' });
Task.belongsTo(User, { foreignKey: 'assignedById', as: 'assigner' });
Task.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

User.hasMany(Task, { foreignKey: 'assignedToId', as: 'assignedTasks' });
User.hasMany(Task, { foreignKey: 'assignedById', as: 'createdTasks' });
Department.hasMany(Task, { foreignKey: 'departmentId', as: 'tasks' });

// ──────────────────────────────────────────────
// Target associations
// ──────────────────────────────────────────────
Target.belongsTo(User, { foreignKey: 'assignedToId', as: 'assignee' });
Target.belongsTo(User, { foreignKey: 'createdById', as: 'creator' });
Target.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

User.hasMany(Target, { foreignKey: 'assignedToId', as: 'targets' });
Department.hasMany(Target, { foreignKey: 'departmentId', as: 'targets' });

// ──────────────────────────────────────────────
// TargetEntry associations
// ──────────────────────────────────────────────
Target.hasMany(TargetEntry, { foreignKey: 'targetId', as: 'entries', onDelete: 'CASCADE' });
TargetEntry.belongsTo(Target, { foreignKey: 'targetId', as: 'target' });
TargetEntry.belongsTo(User, { foreignKey: 'userId', as: 'submitter' });
User.hasMany(TargetEntry, { foreignKey: 'userId', as: 'targetEntries' });

// ──────────────────────────────────────────────
// Performance ↔ User (one per user)
// ──────────────────────────────────────────────
Performance.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Performance, { foreignKey: 'userId', as: 'performance' });

// ──────────────────────────────────────────────
// Notification associations
// ──────────────────────────────────────────────
Notification.belongsTo(User, { foreignKey: 'userId', as: 'recipient' });
Notification.belongsTo(Task, { foreignKey: 'relatedTaskId', as: 'relatedTask', constraints: false });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

// ──────────────────────────────────────────────
// SubTask associations
// ──────────────────────────────────────────────
Task.hasMany(SubTask, { foreignKey: 'taskId', as: 'subtasks', onDelete: 'CASCADE' });
SubTask.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

// ──────────────────────────────────────────────
// TaskComment associations
// ──────────────────────────────────────────────
Task.hasMany(TaskComment, { foreignKey: 'taskId', as: 'comments', onDelete: 'CASCADE' });
TaskComment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
TaskComment.belongsTo(User, { foreignKey: 'userId', as: 'author' });
User.hasMany(TaskComment, { foreignKey: 'userId', as: 'taskComments' });
// Self-referencing for replies
TaskComment.hasMany(TaskComment, { foreignKey: 'parentCommentId', as: 'replies', onDelete: 'CASCADE' });
TaskComment.belongsTo(TaskComment, { foreignKey: 'parentCommentId', as: 'parent' });

// ──────────────────────────────────────────────
// Complaint associations
// ──────────────────────────────────────────────
Complaint.belongsTo(User, { foreignKey: 'userId', as: 'submitter' });
Complaint.belongsTo(User, { foreignKey: 'resolvedById', as: 'resolver', constraints: false });
User.hasMany(Complaint, { foreignKey: 'userId', as: 'complaints' });

// Complaint ↔ User (targeted users — many-to-many)
Complaint.belongsToMany(User, { through: ComplaintTarget, foreignKey: 'complaintId', otherKey: 'userId', as: 'targets' });
User.belongsToMany(Complaint, { through: ComplaintTarget, foreignKey: 'userId', otherKey: 'complaintId', as: 'targetedComplaints' });

module.exports = {
  sequelize,
  User,
  Department,
  Task,
  Target,
  TargetEntry,
  Performance,
  Notification,
  SubTask,
  TaskComment,
  Complaint,
  ComplaintTarget,
};
