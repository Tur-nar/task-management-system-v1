const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Performance = sequelize.define('Performance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tasksCompleted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  tasksOnTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  tasksLate: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  tasksCompletedLate: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  totalTasksAssigned: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  performanceScore: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  rating: {
    type: DataTypes.ENUM('excellent', 'good', 'average', 'needs_improvement'),
    allowNull: false,
    defaultValue: 'average',
  },
  period: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g., 2026-Q2 or 2026-04',
  },
}, {
  timestamps: true,
});

module.exports = Performance;
