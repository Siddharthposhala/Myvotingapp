"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class answers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
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
