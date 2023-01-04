/* eslint-disable no-unused-vars */
const express = require("express");
const app = express();

const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const {
  AdminAdministrator,
  Create_election,
  Create_question,
  Create_options,
  Create_voterId,
} = require("./models");

app.get("/", (request, response) => {
  response.send("hello world");
});

module.exports = app;
