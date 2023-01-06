"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Voters extends Model {
    static associate(models) {
      Voters.belongsTo(models.Election, {
        foreignKey: "electionId",
      });
    }
    static add(voterid, password, electionId) {
      return this.create({
        voterid: voterid,
        voted: false,
        password: password,
        electionId: electionId,
      });
    }

    static modifypassword(voterid, newpassword) {
      return this.update(
        {
          password: newpassword,
        },
        {
          where: {
            voterid: voterid,
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
          voterid: voterId,
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
          voted: true,
        },
        {
          where: {
            id,
          },
        }
      );
    }
  }
  Voters.init(
    {
      case: DataTypes.STRING,
      voterid: DataTypes.STRING,
      voted: DataTypes.STRING,
      password: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Voters",
    }
  );
  return Voters;
};
