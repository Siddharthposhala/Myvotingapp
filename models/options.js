"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class options extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      options.belongsTo(models.questions, {
        foreignKey: "questionID",
        onDelete: "CASCADE",
      });
    }
  }
  options.init(
    {
      optionname: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "options",
    }
  );
  return options;
};
