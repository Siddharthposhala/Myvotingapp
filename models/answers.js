"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Answers extends Model {
    static addResponse({ VoterId, ElectionId, QuestionId, optionChoosed }) {
      return this.create({
        ElectionId,
        QuestionId,
        VoterId,
        optionChoosed,
      });
    }
    static associate(models) {
      Answers.belongsTo(models.Create_election, {
        foreignKey: "ElectionId",
      });

      Answers.belongsTo(models.Create_question, {
        foreignKey: "QuestionId",
      });

      Answers.belongsTo(models.Create_voterId, {
        foreignKey: "VoterId",
      });
      Answers.belongsTo(models.Create_options, {
        foreignKey: "optionChoosed",
      });
    }
  }
  Answers.init(
    {},
    {
      sequelize,
      modelName: "Answers",
    }
  );
  return Answers;
};
