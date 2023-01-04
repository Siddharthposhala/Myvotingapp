"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Create_election extends Model {
    static addElections({ electionName, AdministratorId, url }) {
      return this.create({
        electionName,
        url,
        AdministratorId,
      });
    }
    static geturl(url) {
      return this.findOne({
        where: {
          url,
        },
      });
    }
    static getElectionurl(url) {
      return this.findOne({
        where: {
          url,
        },
        order: [["id", "ASC"]],
      });
    }
    static getElection(AdministratorId) {
      return this.findOne({
        where: {
          AdministratorId,
        },
        order: [["id", "ASC"]],
      });
    }
    static getElections(AdministratorId) {
      return this.findAll({
        where: {
          AdministratorId,
        },
        order: [["id", "ASC"]],
      });
    }

    static launch(id) {
      return this.update(
        {
          launch: true,
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
          end: true,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }
    static associate(models) {
      // define association here
      Create_election.belongsTo(models.Administrator, {
        foreignKey: "administratorId",
      });
      Create_election.hasMany(models.Create_question, {
        foreignKey: "electionId",
      });
      Create_election.hasMany(models.Create_voterId, {
        foreignKey: "electionId",
      });
    }
  }
  Create_election.init(
    {
      url: DataTypes.STRING,
      electionName: DataTypes.STRING,
      launch: DataTypes.BOOLEAN,
      end: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Create_election",
    }
  );
  return Create_election;
};
