const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Target = sequelize.define('Target', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true },
  },
  type: {
    type: DataTypes.ENUM('individual', 'team'),
    allowNull: false,
    defaultValue: 'individual',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  targetValue: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
  },
  currentValue: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('on_track', 'at_risk', 'completed', 'missed'),
    allowNull: false,
    defaultValue: 'on_track',
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = Target;
