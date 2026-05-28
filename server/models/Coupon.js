const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  discountType: {
    type: DataTypes.ENUM('flat', 'percent'),
    allowNull: false,
    field: 'discount_type',
  },
  value: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  minOrderValue: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'min_order_value',
  },
  maxDiscount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'max_discount',
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    field: 'expires_at',
  },
}, {
  tableName: 'coupons',
  timestamps: true,
});

module.exports = Coupon;
