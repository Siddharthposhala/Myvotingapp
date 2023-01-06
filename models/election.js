"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Election extends Model {
    static associate(models) {
      Election.belongsTo(models.Admin, {
        foreignKey: "adminId",
      });
      Election.hasMany(models.questions, {
        foreignKey: "electionId",
      });
      Election.hasMany(models.Voters, {
        foreignKey: "electionId",
      });
    }

    static addElections({ electionName, adminId, publicurl }) {
      return this.create({
        electionName,
        publicurl,
        adminId,
      });
    }
    static getPublicurl(publicurl) {
      return this.findOne({
        where: {
          publicurl,
        },
      });
    }
    static getElectionurl(publicurl) {
      return this.findOne({
        where: {
          publicurl,
        },
        order: [["id", "ASC"]],
      });
    }
    static getElection(adminId) {
      return this.findOne({
        where: {
          adminId,
        },
        order: [["id", "ASC"]],
      });
    }
    static getElections(adminId) {
      return this.findAll({
        where: {
          adminId,
        },
        order: [["id", "ASC"]],
      });
    }

    static launch(id) {
      return this.update(
        {
          launched: true,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }
    static end(id) {
      return this.Election.update(
        {
          ended: true,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }
  }
  Election.init(
    {
      publicurl: DataTypes.STRING,
      electionName: DataTypes.STRING,
      launched: DataTypes.STRING,
      ended: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Election",
    }
  );
  return Election;
};
