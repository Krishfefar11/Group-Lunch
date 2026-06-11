const sequelize  = require('../config/database');
const log        = require('../utils/logger');
const Restaurant = require('./Restaurant');
const MenuItem   = require('./MenuItem');
const Session    = require('./Session');
const SessionMember = require('./SessionMember');
const Preference = require('./Preference');
const Order      = require('./Order');
const OrderItem  = require('./OrderItem');
const Coupon     = require('./Coupon');

// ── Associations ─────────────────────────────────────────────────────────────

// Restaurant → MenuItems (one restaurant has many menu items)
Restaurant.hasMany(MenuItem, { foreignKey: 'restaurant_id', as: 'menuItems', onDelete: 'CASCADE' });
MenuItem.belongsTo(Restaurant, { foreignKey: 'restaurant_id', as: 'restaurant' });

// Session → SessionMembers
Session.hasMany(SessionMember, { foreignKey: 'session_uuid', sourceKey: 'sessionUuid', as: 'members', onDelete: 'CASCADE' });
SessionMember.belongsTo(Session, { foreignKey: 'session_uuid', targetKey: 'sessionUuid', as: 'session' });

// Session → selected Restaurant
Session.belongsTo(Restaurant, { foreignKey: 'selected_restaurant_id', as: 'restaurant' });

// Session → Preferences
Session.hasMany(Preference, { foreignKey: 'session_uuid', sourceKey: 'sessionUuid', as: 'preferences', onDelete: 'CASCADE' });
Preference.belongsTo(Session, { foreignKey: 'session_uuid', targetKey: 'sessionUuid', as: 'session' });

// Session → Orders
Session.hasMany(Order, { foreignKey: 'session_uuid', sourceKey: 'sessionUuid', as: 'orders', onDelete: 'CASCADE' });
Order.belongsTo(Session, { foreignKey: 'session_uuid', targetKey: 'sessionUuid', as: 'session' });

// Order → OrderItems
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Order → Restaurant
Order.belongsTo(Restaurant, { foreignKey: 'restaurant_id', as: 'restaurant' });

// ── Safely add a column if it doesn't already exist ─────────────────────────
async function addColIfMissing(table, col, definition) {
  try {
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${definition}`);
    log.info({ table, col }, 'DB column added');
  } catch { /* column already exists — ignore */ }
}

// ── Connect + verify schema ──────────────────────────────────────────────────
// Production:   authenticate only — schema is managed via `npm run db:migrate`
// Development:  sync creates missing tables, then we patch any new columns safely
const syncDB = async () => {
  try {
    await sequelize.authenticate();
    log.info('MySQL connected');

    if (process.env.NODE_ENV === 'production') {
      log.info('DB ready — run npm run db:migrate to apply schema changes');
    } else {
      await sequelize.sync({ force: false });

      await addColIfMissing('restaurants', 'place_id',  'VARCHAR(100) DEFAULT NULL');
      await addColIfMissing('restaurants', 'address',   'VARCHAR(500) DEFAULT NULL');
      await addColIfMissing('restaurants', 'photo_url', 'TEXT DEFAULT NULL');
      await addColIfMissing('restaurants', 'cached_at', 'DATETIME DEFAULT NULL');
      await addColIfMissing('restaurants', 'source',    "VARCHAR(20) DEFAULT 'static'");
      await addColIfMissing('restaurants', 'city',      'VARCHAR(100) DEFAULT NULL');
      await addColIfMissing('sessions',    'delivery_city', 'VARCHAR(100) DEFAULT NULL');
      await addColIfMissing('sessions',    'upi_id',        'VARCHAR(100) DEFAULT NULL');
      await addColIfMissing('sessions',    'order_url',     'TEXT DEFAULT NULL');
      await addColIfMissing('menu_items',  'image_url', 'TEXT DEFAULT NULL');
      await addColIfMissing('menu_items',  'meal_db_id','VARCHAR(20) DEFAULT NULL');

      log.info('All tables verified');
    }
  } catch (err) {
    log.error({ err }, 'Database connection failed');
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  syncDB,
  Restaurant,
  MenuItem,
  Session,
  SessionMember,
  Preference,
  Order,
  OrderItem,
  Coupon,
};
