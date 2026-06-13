const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'order_id',
    references: { model: 'orders', key: 'id' },
    onDelete: 'CASCADE',
  },
  itemCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'item_code',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  qty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  veg: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  notes: {
    type:         DataTypes.STRING(120),
    allowNull:    true,
    defaultValue: null,
  },
  imageUrl: {
    type:         DataTypes.TEXT,
    allowNull:    true,
    defaultValue: null,
    field:        'image_url',
  },
}, {
  tableName: 'order_items',
  timestamps: false,
});

module.exports = OrderItem;
