"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Create_elections", "administratorId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("Create_elections", {
      fields: ["administratorId"],
      type: "foreign key",
      references: {
        table: "Administrators",
        field: "id",
      },
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Create_elections", "administratorId");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
