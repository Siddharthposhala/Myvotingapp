"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class questions extends Model {
    static associate(models) {
      questions.belongsTo(models.Election, {
        foreignKey: "electionId",
      });
      questions.hasMany(models.options, {
        foreignKey: "questionId",
      });
    }

    static countquestions(electionId) {
      return this.count({
        where: {
          electionId,
        },
      });
    }

    static addquestion({ questionname, description, electionId }) {
      return this.create({
        questionname,
        description,
        electionId,
      });
    }
    static retrievequestion(id) {
      return this.findOne({
        where: {
          id,
        },
        order: [["id", "ASC"]],
      });
    }
    static removequestion(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

    static findquestion(electionId, questionname) {
      return this.findOne({
        where: {
          questionname: questionname,
          electionId: electionId,
        },
      });
    }

    static modifyquestion(questionname, desctiption, questionId) {
      return this.update(
        {
          questionname: questionname,
          description: desctiption,
        },
        {
          where: {
            id: questionId,
          },
        }
      );
    }
    static retrievequestions(electionId) {
      return this.findAll({
        where: {
          electionId,
        },
        order: [["id", "ASC"]],
      });
    }
  }
  questions.init(
    {
      questionname: DataTypes.STRING,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "questions",
    }
  );
  return questions;
};
