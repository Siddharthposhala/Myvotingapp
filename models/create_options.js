"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Create_options extends Model {
    static retrieveoptions(questionId) {
      return this.findAll({
        where: {
          questionId,
        },
        order: [["id", "ASC"]],
      });
    }
    static retriveoption(id) {
      return this.findOne({
        where: {
          id,
        },
      });
    }
    static modifyoption(optionName, id) {
      return this.update(
        {
          optionName: optionName,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }
    static removeoptions(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }
    static addoption({ optionName, questionId }) {
      return this.create({
        optionName,
        questionId,
      });
    }

    static findoption({ optionName }) {
      return this.findOne({
        optionName,
      });
    }

    static associate(models) {
      // define association here
      Create_options.belongsTo(models.Create_question, {
        foreignKey: "quesId",
        onDelete: "CASCADE",
      });
    }
  }
  Create_options.init(
    {
      optionName: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Create_options",
    }
  );
  return Create_options;
};
