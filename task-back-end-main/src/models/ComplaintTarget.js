const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ComplaintTarget = sequelize.define('ComplaintTarget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  complaintId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['complaintId', 'userId'] },
  ],
});

module.exports = ComplaintTarget;
