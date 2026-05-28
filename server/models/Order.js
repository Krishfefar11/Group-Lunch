const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
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
  restaurantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'restaurant_id',
    references: { model: 'restaurants', key: 'id' },
  },
  subtotal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  confirmed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['session_uuid', 'member_id'] },
  ],
});

module.exports = Order;
