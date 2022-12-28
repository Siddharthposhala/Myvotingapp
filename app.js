/* eslint-disable no-unused-vars */
const { response } = require("express");
const express = require("express");
const app = express();

app.get("/", (request, response) => {
  response.send("hello world");
});

module.exports = app;
