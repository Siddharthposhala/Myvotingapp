"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Create_question extends Model {
    static countquestions(electionId) {
      return this.count({
        where: {
          electionId,
        },
      });
    }

    static addquestion({ quesName, description, electionId }) {
      return this.create({
        quesName,
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

    static findquestion(electionId, quesName) {
      return this.findOne({
        where: {
          quesName: quesName,
          electionId: electionId,
        },
      });
    }

    static modifyquestion(quesName, desctiption, questionId) {
      return this.update(
        {
          quesName: quesName,
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
    static associate(models) {
      // define association here
      Create_question.belongsTo(models.Create_election, {
        foreignKey: "electionId",
      });

      Create_question.hasMany(models.Create_options, {
        foreignKey: "quesId",
      });
    }
  }
  Create_question.init(
    {
      quesName: DataTypes.STRING,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Create_question",
    }
  );
  return Create_question;
};
