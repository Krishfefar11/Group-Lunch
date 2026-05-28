const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Preference = sequelize.define('Preference', {
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
  // Store as JSON arrays — e.g. ["NorthIndian", "Biryani"]
  cuisine: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  // Store as JSON arrays — e.g. ["veg", "jain"]
  diet: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  budget: {
    type: DataTypes.ENUM('under200', '200to400', 'any'),
    defaultValue: 'any',
  },
}, {
  tableName: 'preferences',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['session_uuid', 'member_id'] },
  ],
});

module.exports = Preference;
