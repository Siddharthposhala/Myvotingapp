"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Create_election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
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
