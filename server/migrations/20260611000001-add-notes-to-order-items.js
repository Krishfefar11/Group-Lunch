'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('order_items', 'notes', {
      type:         Sequelize.STRING(120),
      allowNull:    true,
      defaultValue: null,
      comment:      'Optional special instructions, e.g. "no onions", "extra spicy"',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('order_items', 'notes');
  },
};
