'use strict';

/**
 * Adds columns present in Restaurant / MenuItem models but absent from the
 * initial schema migration (they were patched via addColIfMissing in dev but
 * never landed in a production migration):
 *
 * restaurants:
 *   place_id   VARCHAR(100) — Foursquare / OSM place identifier
 *   address    VARCHAR(500) — human-readable address
 *   photo_url  TEXT         — cover image from Foursquare CDN
 *   cached_at  DATETIME     — when the Foursquare data was last fetched
 *   source     VARCHAR(20)  — 'static' | 'foursquare' | 'osm'
 *   city       VARCHAR(100) — city name used for geo-search
 *
 * menu_items:
 *   image_url  TEXT         — dish photo
 *   meal_db_id VARCHAR(20)  — TheMealDB recipe ID (for AI enrichment)
 */

const { Sequelize } = require('sequelize');

async function safeAdd(queryInterface, table, column, def) {
  try {
    await queryInterface.addColumn(table, column, def);
    console.log(`  ✓ ${table}.${column} added`);
  } catch (err) {
    if (err.original && err.original.errno === 1060) {
      console.log(`  – ${table}.${column} already exists, skipping`);
    } else {
      throw err;
    }
  }
}

module.exports = {
  async up(queryInterface) {
    // ── restaurants ────────────────────────────────────────────────────────────
    await safeAdd(queryInterface, 'restaurants', 'place_id', {
      type:         Sequelize.STRING(100),
      allowNull:    true,
      defaultValue: null,
    });
    await safeAdd(queryInterface, 'restaurants', 'address', {
      type:         Sequelize.STRING(500),
      allowNull:    true,
      defaultValue: null,
    });
    await safeAdd(queryInterface, 'restaurants', 'photo_url', {
      type:         Sequelize.TEXT,
      allowNull:    true,
      defaultValue: null,
    });
    await safeAdd(queryInterface, 'restaurants', 'cached_at', {
      type:         Sequelize.DATE,
      allowNull:    true,
      defaultValue: null,
    });
    await safeAdd(queryInterface, 'restaurants', 'source', {
      type:         Sequelize.STRING(20),
      allowNull:    true,
      defaultValue: 'static',
    });
    await safeAdd(queryInterface, 'restaurants', 'city', {
      type:         Sequelize.STRING(100),
      allowNull:    true,
      defaultValue: null,
    });

    // ── menu_items ─────────────────────────────────────────────────────────────
    await safeAdd(queryInterface, 'menu_items', 'image_url', {
      type:         Sequelize.TEXT,
      allowNull:    true,
      defaultValue: null,
    });
    await safeAdd(queryInterface, 'menu_items', 'meal_db_id', {
      type:         Sequelize.STRING(20),
      allowNull:    true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    for (const col of ['city', 'source', 'cached_at', 'photo_url', 'address', 'place_id']) {
      try { await queryInterface.removeColumn('restaurants', col); } catch {}
    }
    for (const col of ['meal_db_id', 'image_url']) {
      try { await queryInterface.removeColumn('menu_items', col); } catch {}
    }
  },
};
