"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class options extends Model {
    static associate(models) {
      options.belongsTo(models.questions, {
        foreignKey: "questionId",
        onDelete: "CASCADE",
      });
    }

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
    static modifyoption(optionname, id) {
      return this.update(
        {
          optionname: optionname,
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
    static addoption({ optionname, questionId }) {
      return this.create({
        optionname,
        questionId,
      });
    }

    static findoption({ optionname }) {
      return this.findOne({
        optionname,
      });
    }
  }
  options.init(
    {
      optionname: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "options",
    }
  );
  return options;
};
