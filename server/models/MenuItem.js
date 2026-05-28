const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  restaurantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'restaurant_id',
    references: { model: 'restaurants', key: 'id' },
    onDelete: 'CASCADE',
  },
  itemCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'item_code',  // e.g. "MF01"
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    defaultValue: '',
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  veg: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  jainFriendly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'jain_friendly',
  },
  // Store array as JSON — e.g. ["spicy", "bestseller"]
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'Main Course',
  },
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    field: 'image_url',
  },
  mealDbId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    field: 'meal_db_id',
  },
}, {
  tableName: 'menu_items',
  timestamps: false,
});

module.exports = MenuItem;
