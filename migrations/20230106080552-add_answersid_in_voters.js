"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("answers", "ElectionId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("answers", {
      fields: ["ElectionId"],
      type: "foreign key",
      references: {
        table: "Elections",
        field: "id",
      },
    });

    await queryInterface.addColumn("answers", "QuestionId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("answers", {
      fields: ["QuestionId"],
      type: "foreign key",
      references: {
        table: "questions",
        field: "id",
      },
    });
    await queryInterface.addColumn("answers", "VoterId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("answers", {
      fields: ["VoterId"],
      type: "foreign key",
      references: {
        table: "Voters",
        field: "id",
      },
    });

    await queryInterface.addColumn("answers", "chossedoption", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("answers", {
      fields: ["chossedoption"],
      type: "foreign key",
      references: {
        table: "options",
        field: "id",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("answers", "VoterId");
    await queryInterface.removeColumn("answers", "ElectionId");
    await queryInterface.removeColumn("answers", "QuestionId");
    await queryInterface.removeColumn("answers", "chossedoption");
  },
};
