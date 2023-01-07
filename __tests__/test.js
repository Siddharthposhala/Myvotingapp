/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const db = require("../models/index");
const app = require("../app");
const request = require("supertest");
const cheerio = require("cheerio");
let server, agent;
function extractCsrfToken(res) {
  var x = cheerio.load(res.text);
  return x(`[name=_csrf]`).val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Voting test suite", () => {
  beforeAll(async () => {
    server = app.listen(2003, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("test to Signup", async () => {
    res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/admin").send({
      firstName: "user",
      lastName: "a",
      email: "user.a@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("test to User Signout", async () => {
    let res = await agent.get("/elections");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/elections");
    expect(res.statusCode).toBe(302);
  });

  // test("test to Create an Election", async () => {
  //   let agent = request.agent(server);
  //   await login(agent, "user.a@test.com", "12345678");
  //   let res = await agent.get("/create");
  //   let csrfToken = extractCsrfToken(res);
  //   res = await agent.post("/elections").send({
  //     electionName: "User",
  //     publicurl: "test",
  //     _csrf: csrfToken,
  //   });
  //   expect(res.statusCode).toBe(302);
  // });

  test("test to Delete an Election", async () => {});

  test("test to Add a Question", async () => {});

  test("test to Delete a Question", async () => {});
});
