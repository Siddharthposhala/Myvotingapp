"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class answers extends Model {
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
        foreignKey: "chossedoption",
      });
    }

    static addResponse({ VoterId, ElectionId, QuestionId, chossedoption }) {
      return this.create({
        ElectionId,
        QuestionId,
        VoterId,
        chossedoption,
      });
    }
  }
  answers.init(
    {},
    {
      sequelize,
      modelName: "answers",
    }
  );
  return answers;
};
