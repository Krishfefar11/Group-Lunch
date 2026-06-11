'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sessions', 'expires_at', {
      type:         Sequelize.DATE,
      allowNull:    true,
      defaultValue: null,
      comment:      'Session auto-expires after 24 h; null means no expiry (legacy rows)',
    });

    // Back-fill existing rows: 24 h from their created_at timestamp
    await queryInterface.sequelize.query(`
      UPDATE sessions
      SET expires_at = DATE_ADD(createdAt, INTERVAL 24 HOUR)
      WHERE expires_at IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('sessions', 'expires_at');
  },
};
