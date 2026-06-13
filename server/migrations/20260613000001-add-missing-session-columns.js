'use strict';

/**
 * Adds columns that exist in the Session model but were missing from the
 * initial schema migration:
 *   - delivery_city  (STRING 100, nullable)
 *   - upi_id         (STRING 100, nullable)
 *   - order_url      (TEXT, nullable)
 *
 * Safe to run multiple times — each addColumn is wrapped in a try/catch so
 * it skips gracefully if the column already exists (e.g. on a fresh DB where
 * you ran the initial migration from an already-patched repo).
 */

const { Sequelize } = require('sequelize');

async function safeAddColumn(queryInterface, table, column, def) {
  try {
    await queryInterface.addColumn(table, column, def);
    console.log(`  ✓ Added ${table}.${column}`);
  } catch (err) {
    // MySQL/TiDB error 1060 = "Duplicate column name"
    if (err.original && err.original.errno === 1060) {
      console.log(`  – ${table}.${column} already exists, skipping`);
    } else {
      throw err;
    }
  }
}

module.exports = {
  async up(queryInterface) {
    await safeAddColumn(queryInterface, 'sessions', 'delivery_city', {
      type:         Sequelize.STRING(100),
      allowNull:    true,
      defaultValue: null,
      after:        'delivery_address',   // cosmetic — TiDB honours this
    });

    await safeAddColumn(queryInterface, 'sessions', 'upi_id', {
      type:         Sequelize.STRING(100),
      allowNull:    true,
      defaultValue: null,
      after:        'delivery_city',
    });

    await safeAddColumn(queryInterface, 'sessions', 'order_url', {
      type:         Sequelize.TEXT,
      allowNull:    true,
      defaultValue: null,
      after:        'upi_id',
    });
  },

  async down(queryInterface) {
    // Reverse: drop the three columns
    for (const col of ['order_url', 'upi_id', 'delivery_city']) {
      try {
        await queryInterface.removeColumn('sessions', col);
        console.log(`  ✓ Removed sessions.${col}`);
      } catch (err) {
        console.log(`  – sessions.${col} not found, skipping`);
      }
    }
  },
};
