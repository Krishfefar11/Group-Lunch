const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SessionMember = sequelize.define('SessionMember', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sessionUuid: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'session_uuid',
  },
  memberId: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'member_id',
  },
  memberName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'member_name',
  },
  hasSubmittedPreference: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_submitted_preference',
  },
  hasConfirmedOrder: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_confirmed_order',
  },
}, {
  tableName: 'session_members',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['session_uuid', 'member_id'] },
  ],
});

module.exports = SessionMember;
