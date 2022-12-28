"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Create_voterId extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
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
