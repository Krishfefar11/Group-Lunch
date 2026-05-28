'use strict';

// Initial schema migration.
// Uses IF-NOT-EXISTS logic so it is safe to run against a DB that was
// previously set up via sequelize.sync() — tables that already exist are
// skipped rather than failing.

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = await queryInterface.showAllTables();
    const skip = (name) => existing.includes(name);

    // ── restaurants ──────────────────────────────────────────────────────────
    if (!skip('restaurants')) {
      await queryInterface.createTable('restaurants', {
        id:               { type: Sequelize.INTEGER,      autoIncrement: true, primaryKey: true },
        name:             { type: Sequelize.STRING(100),  allowNull: false },
        cuisines:         { type: Sequelize.JSON,         allowNull: false, defaultValue: '[]' },
        rating:           { type: Sequelize.DECIMAL(2,1), allowNull: false },
        delivery_time_min:{ type: Sequelize.INTEGER,      allowNull: false },
        veg_friendly:     { type: Sequelize.BOOLEAN,      defaultValue: false },
        jain_friendly:    { type: Sequelize.BOOLEAN,      defaultValue: false },
        price_per_person: { type: Sequelize.INTEGER,      allowNull: false },
        image_emoji:      { type: Sequelize.STRING(10),   defaultValue: '🍽️' },
        area:             { type: Sequelize.STRING(100),  defaultValue: 'Bangalore' },
        image_url:        { type: Sequelize.STRING(500),  allowNull: true },
        createdAt:        { type: Sequelize.DATE,         allowNull: false },
        updatedAt:        { type: Sequelize.DATE,         allowNull: false },
      });
    }

    // ── menu_items ───────────────────────────────────────────────────────────
    if (!skip('menu_items')) {
      await queryInterface.createTable('menu_items', {
        id:            { type: Sequelize.INTEGER,     autoIncrement: true, primaryKey: true },
        restaurant_id: { type: Sequelize.INTEGER,     allowNull: false, references: { model: 'restaurants', key: 'id' }, onDelete: 'CASCADE' },
        item_code:     { type: Sequelize.STRING(20),  allowNull: false },
        name:          { type: Sequelize.STRING(100), allowNull: false },
        description:   { type: Sequelize.STRING(255), defaultValue: '' },
        price:         { type: Sequelize.INTEGER,     allowNull: false },
        veg:           { type: Sequelize.BOOLEAN,     defaultValue: false },
        jain_friendly: { type: Sequelize.BOOLEAN,     defaultValue: false },
        tags:          { type: Sequelize.JSON,        defaultValue: '[]' },
        category:      { type: Sequelize.STRING(50),  defaultValue: 'Main Course' },
      });
    }

    // ── sessions ─────────────────────────────────────────────────────────────
    if (!skip('sessions')) {
      await queryInterface.createTable('sessions', {
        id:                   { type: Sequelize.INTEGER,     autoIncrement: true, primaryKey: true },
        session_uuid:         { type: Sequelize.STRING(36),  allowNull: false, unique: true },
        organizer_id:         { type: Sequelize.STRING(36),  allowNull: false },
        organizer_name:       { type: Sequelize.STRING(100), allowNull: false },
        status:               { type: Sequelize.ENUM('collecting','restaurant_picked','ordering','order_placed','preparing','out_for_delivery','delivered'), defaultValue: 'collecting' },
        selected_restaurant_id:{ type: Sequelize.INTEGER,    allowNull: true, references: { model: 'restaurants', key: 'id' } },
        coupon_code:          { type: Sequelize.STRING(20),  allowNull: true },
        coupon_discount_type: { type: Sequelize.STRING(10),  allowNull: true },
        coupon_discount_value:{ type: Sequelize.INTEGER,     allowNull: true },
        coupon_savings:       { type: Sequelize.INTEGER,     allowNull: true },
        order_id:             { type: Sequelize.STRING(50),  allowNull: true },
        delivery_address:     { type: Sequelize.STRING(255), defaultValue: '' },
        placed_at:            { type: Sequelize.DATE,        allowNull: true },
        createdAt:            { type: Sequelize.DATE,        allowNull: false },
        updatedAt:            { type: Sequelize.DATE,        allowNull: false },
      });
    }

    // ── session_members ───────────────────────────────────────────────────────
    if (!skip('session_members')) {
      await queryInterface.createTable('session_members', {
        id:                      { type: Sequelize.INTEGER,     autoIncrement: true, primaryKey: true },
        session_uuid:            { type: Sequelize.STRING(36),  allowNull: false },
        member_id:               { type: Sequelize.STRING(36),  allowNull: false },
        member_name:             { type: Sequelize.STRING(100), allowNull: false },
        has_submitted_preference:{ type: Sequelize.BOOLEAN,     defaultValue: false },
        has_confirmed_order:     { type: Sequelize.BOOLEAN,     defaultValue: false },
        createdAt:               { type: Sequelize.DATE,        allowNull: false },
        updatedAt:               { type: Sequelize.DATE,        allowNull: false },
      });
      await queryInterface.addIndex('session_members', ['session_uuid', 'member_id'], { unique: true });
    }

    // ── preferences ───────────────────────────────────────────────────────────
    if (!skip('preferences')) {
      await queryInterface.createTable('preferences', {
        id:          { type: Sequelize.INTEGER,    autoIncrement: true, primaryKey: true },
        session_uuid:{ type: Sequelize.STRING(36), allowNull: false },
        member_id:   { type: Sequelize.STRING(36), allowNull: false },
        member_name: { type: Sequelize.STRING(100),allowNull: false },
        cuisine:     { type: Sequelize.JSON,       defaultValue: '[]' },
        diet:        { type: Sequelize.JSON,       defaultValue: '[]' },
        budget:      { type: Sequelize.ENUM('under200','200to400','any'), defaultValue: 'any' },
        createdAt:   { type: Sequelize.DATE,       allowNull: false },
        updatedAt:   { type: Sequelize.DATE,       allowNull: false },
      });
      await queryInterface.addIndex('preferences', ['session_uuid', 'member_id'], { unique: true });
    }

    // ── orders ────────────────────────────────────────────────────────────────
    if (!skip('orders')) {
      await queryInterface.createTable('orders', {
        id:           { type: Sequelize.INTEGER,     autoIncrement: true, primaryKey: true },
        session_uuid: { type: Sequelize.STRING(36),  allowNull: false },
        member_id:    { type: Sequelize.STRING(36),  allowNull: false },
        member_name:  { type: Sequelize.STRING(100), allowNull: false },
        restaurant_id:{ type: Sequelize.INTEGER,     allowNull: false },
        subtotal:     { type: Sequelize.INTEGER,     allowNull: false, defaultValue: 0 },
        confirmed:    { type: Sequelize.BOOLEAN,     defaultValue: false },
        createdAt:    { type: Sequelize.DATE,        allowNull: false },
        updatedAt:    { type: Sequelize.DATE,        allowNull: false },
      });
      await queryInterface.addIndex('orders', ['session_uuid', 'member_id'], { unique: true });
    }

    // ── order_items ───────────────────────────────────────────────────────────
    if (!skip('order_items')) {
      await queryInterface.createTable('order_items', {
        id:        { type: Sequelize.INTEGER,     autoIncrement: true, primaryKey: true },
        order_id:  { type: Sequelize.INTEGER,     allowNull: false, references: { model: 'orders', key: 'id' }, onDelete: 'CASCADE' },
        item_code: { type: Sequelize.STRING(20),  allowNull: false },
        name:      { type: Sequelize.STRING(100), allowNull: false },
        price:     { type: Sequelize.INTEGER,     allowNull: false },
        qty:       { type: Sequelize.INTEGER,     allowNull: false, defaultValue: 1 },
        veg:       { type: Sequelize.BOOLEAN,     defaultValue: false },
      });
    }

    // ── coupons ───────────────────────────────────────────────────────────────
    if (!skip('coupons')) {
      await queryInterface.createTable('coupons', {
        id:              { type: Sequelize.INTEGER,     autoIncrement: true, primaryKey: true },
        code:            { type: Sequelize.STRING(20),  allowNull: false, unique: true },
        description:     { type: Sequelize.STRING(255), allowNull: false },
        discount_type:   { type: Sequelize.ENUM('flat','percent'), allowNull: false },
        value:           { type: Sequelize.INTEGER,     allowNull: false },
        min_order_value: { type: Sequelize.INTEGER,     defaultValue: 0 },
        max_discount:    { type: Sequelize.INTEGER,     allowNull: true },
        active:          { type: Sequelize.BOOLEAN,     defaultValue: true },
        expires_at:      { type: Sequelize.DATE,        allowNull: true },
        createdAt:       { type: Sequelize.DATE,        allowNull: false },
        updatedAt:       { type: Sequelize.DATE,        allowNull: false },
      });
    }
  },

  async down(queryInterface) {
    // Drop in reverse FK order
    await queryInterface.dropTable('order_items',     { cascade: true });
    await queryInterface.dropTable('orders',          { cascade: true });
    await queryInterface.dropTable('preferences',     { cascade: true });
    await queryInterface.dropTable('session_members', { cascade: true });
    await queryInterface.dropTable('sessions',        { cascade: true });
    await queryInterface.dropTable('coupons',         { cascade: true });
    await queryInterface.dropTable('menu_items',      { cascade: true });
    await queryInterface.dropTable('restaurants',     { cascade: true });
  },
};
