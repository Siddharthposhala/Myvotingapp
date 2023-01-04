"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Answers", "ElectionId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("Answers", {
      fields: ["ElectionId"],
      type: "foreign key",
      references: {
        table: "Create_elections",
        field: "id",
      },
    });

    await queryInterface.addColumn("Answers", "QuestionId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("Answers", {
      fields: ["QuestionId"],
      type: "foreign key",
      references: {
        table: "Create_questions",
        field: "id",
      },
    });
    await queryInterface.addColumn("Answers", "VoterId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("Answers", {
      fields: ["VoterId"],
      type: "foreign key",
      references: {
        table: "Create_voterIds",
        field: "id",
      },
    });

    await queryInterface.addColumn("Answers", "optionChoosed", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("Answers", {
      fields: ["optionChoosed"],
      type: "foreign key",
      references: {
        table: "Create_options",
        field: "id",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Answers", "VoterId");
    await queryInterface.removeColumn("Answers", "ElectionId");
    await queryInterface.removeColumn("Answers", "QuestionId");
    await queryInterface.removeColumn("Answers", "optionChoosed");
  },
};
