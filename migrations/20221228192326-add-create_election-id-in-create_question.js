"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Create_questions", "electionId", {
      type: Sequelize.DataTypes.INTEGER,
    });

    await queryInterface.addConstraint("Create_questions", {
      fields: ["electionId"],
      type: "foreign key",
      references: {
        table: "Create_elections",
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
    await queryInterface.removeColumn("Create_questions", "electionId");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
