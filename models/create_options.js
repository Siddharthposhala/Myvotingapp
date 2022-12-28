"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Create_options extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
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
