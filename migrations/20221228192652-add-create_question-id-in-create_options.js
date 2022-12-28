"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Create_options", "quesId", {
      type: Sequelize.DataTypes.INTEGER,
      onDelete: "CASCADE",
    });

    await queryInterface.addConstraint("Create_options", {
      fields: ["quesId"],
      type: "foreign key",
      onDelete: "CASCADE",
      references: {
        table: "Create_questions",
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
    await queryInterface.removeColumn("Create_options", "quesId");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
