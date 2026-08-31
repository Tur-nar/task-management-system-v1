const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(
      'deadline_warning',
      'overdue_alert',
      'task_completed',
      'task_assigned',
      'performance_update',
      'general'
    ),
    allowNull: false,
    defaultValue: 'general',
  },
  severity: {
    type: DataTypes.ENUM('info', 'warning', 'critical', 'success'),
    allowNull: false,
    defaultValue: 'info',
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  timestamps: true,
});

module.exports = Notification;
