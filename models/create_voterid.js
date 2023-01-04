"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Create_voterId extends Model {
    static add(voterid, password, electionId) {
      return this.create({
        voterId: voterid,
        responseStatus: false,
        password: password,
        electionId: electionId,
      });
    }

    static modifypassword(voterId, newpassword) {
      return this.update(
        {
          password: newpassword,
        },
        {
          where: {
            voterId: voterId,
          },
        }
      );
    }

    static retrivevoters(electionId) {
      return this.findAll({
        where: {
          electionId,
        },
      });
    }
    static countvoters(electionId) {
      return this.count({
        where: {
          electionId,
        },
      });
    }

    static findVoter(voterId) {
      return this.findOne({
        where: {
          voterId: voterId,
        },
      });
    }

    static delete(voterId) {
      return this.destroy({
        where: {
          id: voterId,
        },
      });
    }

    static votecompleted(id) {
      return this.update(
        {
          responseStatus: true,
        },
        {
          where: {
            id,
          },
        }
      );
    }
    static associate(models) {
      // define association here
      Create_voterId.belongsTo(models.Create_election, {
        foreignKey: "electionId",
      });
    }
  }
  Create_voterId.init(
    {
      persona: DataTypes.STRING,
      voterId: DataTypes.STRING,
      responseStatus: DataTypes.BOOLEAN,
      password: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Create_voterId",
    }
  );
  return Create_voterId;
};
