"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Create_question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
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
