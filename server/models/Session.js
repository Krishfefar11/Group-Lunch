const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  sessionUuid: {
    type: DataTypes.STRING(36),
    allowNull: false,
    unique: true,
    field: 'session_uuid',
  },
  organizerId: {
    type: DataTypes.STRING(36),
    allowNull: false,
    field: 'organizer_id',
  },
  organizerName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'organizer_name',
  },
  status: {
    type: DataTypes.ENUM('collecting', 'restaurant_picked', 'ordering', 'order_placed', 'preparing', 'out_for_delivery', 'delivered'),
    defaultValue: 'collecting',
  },
  selectedRestaurantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'selected_restaurant_id',
    references: { model: 'restaurants', key: 'id' },
  },
  // Coupon applied — stored as flat columns (no separate table needed)
  couponCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    field: 'coupon_code',
  },
  couponDiscountType: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: null,
    field: 'coupon_discount_type',
  },
  couponDiscountValue: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'coupon_discount_value',
  },
  couponSavings: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'coupon_savings',
  },
  orderId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
    field: 'order_id',
  },
  deliveryAddress: {
    type: DataTypes.STRING(255),
    defaultValue: '',
    field: 'delivery_address',
  },
  placedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    field: 'placed_at',
  },
  deliveryCity: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
    field: 'delivery_city',
  },
}, {
  tableName: 'sessions',
  timestamps: true,
});

module.exports = Session;
