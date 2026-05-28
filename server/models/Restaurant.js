const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Restaurant = sequelize.define('Restaurant', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  // Store array as JSON — e.g. ["Biryani", "South Indian"]
  cuisines: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: false,
  },
  deliveryTimeMin: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'delivery_time_min',
  },
  vegFriendly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'veg_friendly',
  },
  jainFriendly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'jain_friendly',
  },
  pricePerPerson: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'price_per_person',
  },
  imageEmoji: {
    type: DataTypes.STRING(10),
    defaultValue: '🍽️',
    field: 'image_emoji',
  },
  area: {
    type: DataTypes.STRING(100),
    defaultValue: 'Bangalore',
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
    field: 'image_url',
  },
  // ── Real restaurant fields (from Foursquare / OpenStreetMap) ──
  placeId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
    field: 'place_id',
  },
  address: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null,
  },
  photoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    field: 'photo_url',
  },
  cachedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    field: 'cached_at',
  },
  source: {
    type: DataTypes.STRING(20),
    defaultValue: 'static',
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
  },
}, {
  tableName: 'restaurants',
  timestamps: true,
});

module.exports = Restaurant;
