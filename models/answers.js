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
      answers.belongsTo(models.Election, {
        foreignKey: "ElectionId",
      });

      answers.belongsTo(models.questions, {
        foreignKey: "QuestionId",
      });

      answers.belongsTo(models.Voters, {
        foreignKey: "VoterId",
      });
      answers.belongsTo(models.options, {
        foreignKey: "optionChoosed",
      });
    }
  }
  Answers.init(
    {
      id: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Answers",
    }
  );
  return Answers;
};
