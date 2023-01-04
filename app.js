/* eslint-disable no-undef */
const express = require("express");
const app = express();
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const {
  Administrator,
  Create_election,
  Create_question,
  Create_options,
  Create_voterId,
  Answers,
} = require("./models");
const bodyParser = require("body-parser");
const connectEnsureLogin = require("connect-ensure-login");
const LocalStratergy = require("passport-local");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
//const { AsyncLocalStorage } = require("async_hooks");
const flash = require("connect-flash");
const saltRounds = 10;
app.use(bodyParser.json());
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(cookieParser("Some secret String"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.use(
  session({
    secret: "my-super-secret-key-2837428907583420",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use((request, response, next) => {
  response.locals.messages = request.flash();
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  "user-local",
  new LocalStratergy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      Administrator.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Email or Password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Invalid Email or Password" });
        });
    }
  )
);

passport.use(
  "voter-local",
  new LocalStratergy(
    {
      usernameField: "voterid",
      passwordField: "password",
    },
    (username, password, done) => {
      Create_voterId.findOne({
        where: { voterid: username },
      })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, {
              message: "Invalid VoterId or password",
            });
          }
        })
        .catch(() => {
          return done(null, false, {
            message: "Invalid VoterId or password",
          });
        });
    }
  )
);
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

passport.serializeUser((user, done) => {
  done(null, { id: user.id, case: user.persona });
});

passport.deserializeUser((id, done) => {
  if (iduser.persona === "Admins") {
    Administrator.findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  } else if (iduser.persona === "Voter") {
    Create_voterId.findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  }
});

app.get("/", (request, response) => {
  if (request.user) {
    if (request.user.persona === "Admins") {
      return response.redirect("/elections");
    } else if (request.user.persona === "Voter") {
      request.logout((err) => {
        if (err) {
          return response.json(err);
        }
        response.redirect("/");
      });
    }
  } else {
    response.render("index", {
      title: "Welcom To My Online Voting App",
    });
  }
});

app.get(
  "/index",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("index", {
      title: "Online Voting Application",
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      let user = await Administrator.findByPk(request.user.id);
      let username = user.dataValues.firstName;
      try {
        const elections_list = await Create_election.getElections(
          request.user.id
        );
        if (request.accepts("html")) {
          response.render("elections", {
            title: "Online Voting interface",
            userName: username,
            elections_list,
          });
        } else {
          return response.json({
            elections_list,
          });
        }
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else if (request.user.role === "voter") {
      return response.redirect("/");
    }
  }
);
app.get(
  "/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      response.render("new", {
        title: "Create an election",
        csrfToken: request.csrfToken(),
      });
    }
  }
);

app.get("/signup", (request, response) => {
  try {
    response.render("signup", {
      title: "Create admin account",
      csrfToken: request.csrfToken(),
    });
  } catch (err) {
    console.log(err);
  }
});

app.get("/signout", (request, response, next) => {
  request.logout((error) => {
    if (error) {
      return next(error);
    }
    response.redirect("/");
  });
});

app.get("/login", (request, response) => {
  if (request.user) {
    return response.redirect("/elections");
  }
  response.render("login", {
    title: "Login to your admin account",
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/listofelections/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      try {
        const election = await Create_election.findByPk(request.params.id);
        const voter = await Create_voterId.retrivevoters(request.params.id);
        const question = await Create_question.retrievequestion(
          request.params.id
        );

        await Create_election.getElections(request.params.id, request.user.id);
        const countofquestions = await Create_question.countquestions(
          request.params.id
        );
        const countofvoters = await Create_voterId.countvoters(
          request.params.id
        );
        response.render("electionpage", {
          election: election,
          url: election.url,
          voters: voter,
          questions: question,
          id: request.params.id,
          title: election.electionName,
          countquestions: countofquestions,
          countvoters: countofvoters,
        });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);
app.get(
  "/questions/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      await Create_election.getElections(request.params.id, request.user.id);
      const questions = await Create_question.retrievequestions(
        request.params.id
      );
      const election = await Create_election.findByPk(request.params.id);
      if (election.launch) {
        request.flash("error", "Election as launched can't modify question");
        return response.redirect(`/listofelections/${request.params.id}`);
      }
      if (request.accepts("html")) {
        response.render("question", {
          title: Create_election.electionName,
          id: request.params.id,
          questions: questions,
          election: election,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({
          questions1,
        });
      }
    }
  }
);
app.get(
  "/questionscreate/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      response.render("createques", {
        id: request.params.id,
        csrfToken: request.csrfToken(),
      });
    }
  }
);

app.get(
  "/displayelections/correspondingquestion/:id/:questionId/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      try {
        const question = await Create_question.retrievequestion(
          request.params.questionId
        );
        const option = await Create_options.retrieveoptions(
          request.params.questionId
        );
        if (request.accepts("html")) {
          response.render("questiondisplay", {
            title: question.quesName,
            description: question.description,
            id: request.params.id,
            questionId: request.params.questionId,
            option,
            csrfToken: request.csrfToken(),
          });
        } else {
          return response.json({
            option,
          });
        }
      } catch (err) {
        return response.status(422).json(err);
      }
    }
  }
);

app.get(
  "/elections/:electionId/questions/:questionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      const adminId = request.user.id;
      const admin = await Administrator.findByPk(adminId);
      const election = await Create_election.findByPk(
        request.params.electionId
      );
      const Question = await Create_question.findByPk(
        request.params.questionId
      );
      response.render("modifyquestion", {
        username: admin.name,
        election: election,
        question: Question,
        csrf: request.csrfToken(),
      });
    }
  }
);

app.get(
  "/elections/:electionId/questions/:questionId/options/:optionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      const adminId = request.user.id;
      const admin = await Administrator.findByPk(adminId);
      const election = await Create_election.findByPk(
        request.params.electionId
      );
      const Question = await Create_question.findByPk(
        request.params.questionId
      );
      const option = await Create_options.findByPk(request.params.optionId);
      response.render("modifyoption", {
        username: admin.name,
        election: election,
        question: Question,
        option: option,
        csrf: request.csrfToken(),
      });
    }
  }
);

app.get(
  "/voters/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      await Create_election.getElections(request.params.id, request.user.id);
      const voterlist = await Create_voterId.retrivevoters(request.params.id);
      const election = await Create_election.findByPk(request.params.id);
      if (request.accepts("html")) {
        response.render("voter", {
          title: Create_election.electionName,
          id: request.params.id,
          voters: voterlist,
          election: election,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({
          voterlist,
        });
      }
    }
  }
);

app.get("/voters/listofelections/:id", async (request, response) => {
  if (request.user.persona === "Admins") {
    try {
      const electionname = await Create_election.getElections(
        request.params.id,
        request.user.id
      );
      const countofquestions = await Create_question.countquestions(
        request.params.id
      );
      const countofvoters = await Create_voterId.countvoters(request.params.id);
      const election = await Create_election.findByPk(request.params.id);
      response.render("electionpage", {
        url: election.url,
        election: election,
        id: request.params.id,
        title: electionname.electionName,
        countquestions: countofquestions,
        countvoters: countofvoters,
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
});

app.get("/elections/listofelections/:id", async (request, response) => {
  if (request.user.persona === "Admins") {
    try {
      const election = await Create_election.getElections(
        request.params.id,
        request.user.id
      );
      const ele = await Create_election.findByPk(request.params.id);
      const countofquestions = await Create_question.countquestions(
        request.params.id
      );
      const countofvoters = await Create_voterId.countvoters(request.params.id);
      response.render("electionpage", {
        id: request.params.id,
        url: ele.url,
        title: election.electionName,
        election: election,
        countquestions: countofquestions,
        countvoters: countofvoters,
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
});

app.get(
  "/createvoter/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      const voterslist = await Create_voterId.retrivevoters(request.params.id);
      if (request.accepts("html")) {
        response.render("registervoter", {
          id: request.params.id,
          csrfToken: request.csrfToken({ voterslist }),
        });
      } else {
        return response.json({ voterslist });
      }
    }
  }
);

app.get(
  "/elections/:electionId/voter/:voterId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      const election = await Create_election.findByPk(
        request.params.electionId
      );
      const voter = await Create_voterId.findByPk(request.params.voterId);
      response.render("modifyvoters", {
        voter: voter,
        election: election,
        csrf: request.csrfToken(),
      });
    }
  }
);

app.get(
  "/election/:id/launch",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      const question = await Create_question.findAll({
        where: { electionId: request.params.id },
      });
      if (question.length <= 1) {
        request.flash("error", "Add atleast two questions");
        return response.redirect(`/listofelections/${request.params.id}`);
      }

      for (let i = 0; i < question.length; i++) {
        const option = await Create_options.retrieveoptions(question[i].id);
        if (option.length <= 1) {
          request.flash("error", "Add atleast two options to the question");
          return response.redirect(`/listofelections/${request.params.id}`);
        }
      }

      const voters = await Create_voterId.retrivevoters(request.params.id);
      if (voters.length <= 1) {
        request.flash(
          "error",
          "Atleast two voter should be present to lauch election"
        );
        return response.redirect(`/listofelections/${request.params.id}`);
      }

      try {
        await Create_election.launch(request.params.id);
        return response.redirect(`/listofelections/${request.params.id}`);
      } catch (error) {
        console.log(error);
        return response.send(error);
      }
    }
  }
);

app.get(
  "/election/:id/electionpreview",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      const election = await Create_election.findByPk(request.params.id);
      const optionsnew = [];
      const question = await Create_question.retrievequestions(
        request.params.id
      );

      for (let i = 0; i < question.length; i++) {
        const optionlist = await Create_options.retrieveoptions(question[i].id);
        optionsnew.push(optionlist);
      }
      if (election.launch) {
        request.flash("error", "Can not preview election as launched");
        return response.redirect(`/listofelections/${request.params.id}`);
      }

      response.render("electionpreview", {
        election: election,
        questions: question,
        options: optionsnew,
        csrf: request.csrfToken(),
      });
    }
  }
);

app.get("/externalpage/:publicurl", async (request, response) => {
  try {
    const election = await Create_election.getElectionurl(request.params.url);
    return response.render("voterlogin", {
      url: election.url,
      csrfToken: request.csrfToken(),
    });
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/vote/:publicurl/", async (request, response) => {
  if (request.user === false) {
    request.flash("error", "Login to cast vote");
    return response.redirect(`/externalpage/${request.params.url}`);
  }
  const election = await Create_election.getElectionurl(request.params.url);

  if (request.user.voted && election.launch) {
    return response.redirect(`/vote/${request.params.url}/endpage`);
  }

  try {
    const election = await Create_election.getElectionurl(request.params.url);
    if (request.user.persona === "Voter") {
      if (election.launch) {
        const question = await Create_question.retrievequestions(election.id);
        let optionsnew = [];
        for (let i = 0; i < question.length; i++) {
          const optionlist = await Create_options.retrieveoptions(
            question[i].id
          );
          optionsnew.push(optionlist);
        }

        return response.render("voterview", {
          publicurl: request.params.url,
          id: election.id,
          title: election.electionName,
          electionId: election.id,
          question,
          optionsnew,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.render("invalid");
      }
    } else if (request.user.persona === "Admins") {
      request.flash("error", "Signout as admin to vote");
      return response.redirect(`/lisofelections/${election.id}`);
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/vote/:publicurl/endpage", async (request, response) => {
  response.render("endpage");
});

app.post(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      if (request.body.electionName.length === 0) {
        request.flash("error", "Empty election name");
        return response.redirect("/create");
      }
      if (request.body.url.length === 0) {
        request.flash("error", "Empty public url");
        return response.redirect("/create");
      }

      try {
        await Create_election.addElections({
          electionName: request.body.electionName,
          publicurl: request.body.url,
          adminId: request.user.id,
        });
        return response.redirect("/elections");
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    } else if (request.user.role === "voter") {
      return response.redirect("/");
    }
  }
);

app.post("/admin", async (request, response) => {
  if (request.body.email.length == 0) {
    request.flash("error", "Empty email");
    return response.redirect("/signup");
  }
  if (request.body.firstName.length == 0) {
    request.flash("error", "firstname can not be empty!!");
    return response.redirect("/signup");
  }
  if (request.body.password.length == 0) {
    request.flash("error", "password can not be empty!!");
    return response.redirect("/signup");
  }
  if (request.body.password.length <= 5) {
    request.flash("error", "password length should be minimum of length 6!!");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await Administrator.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/");
      } else {
        response.redirect("/elections");
      }
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "User Already Exist with this mail!!");
    return response.redirect("/signup");
  }
});

app.post(
  "/session",
  passport.authenticate("user-local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (request, response) => {
    return response.redirect("/elections");
  }
);

app.post(
  "/questionscreate/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      if (!request.body.quesName) {
        request.flash("error", "Empty Question");
        return response.redirect(`/questionscreate/${request.params.id}`);
      }
      if (request.body.quesName < 3) {
        request.flash("error", "Question must be atleast 3 characters");
        return response.redirect(`/questionscreate/${request.params.id}`);
      }

      const questionexist = await Create_question.findquestion(
        request.params.id,
        request.body.quesName
      );
      if (questionexist) {
        request.flash("error", "Question already exists");
        return response.redirect(`/questionscreate/${request.params.id}`);
      }

      try {
        const question = await Create_question.addquestion({
          electionId: request.params.id,
          quesName: request.body.quesName,
          description: request.body.description,
        });
        return response.redirect(
          `/displayelections/correspondingquestion/${request.params.id}/${question.id}/options`
        );
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

app.post(
  "/displayelections/correspondingquestion/:id/:questionId/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      if (!request.body.optionName) {
        request.flash("error", "Empty Option");
        return response.redirect(
          `/displayelections/correspondingquestion/${request.params.id}/${request.params.questionId}/options`
        );
      }
      try {
        await Create_options.addoption({
          optionname: request.body.optionName,
          questionId: request.params.questionId,
        });
        return response.redirect(
          `/displayelections/correspondingquestion/${request.params.id}/${request.params.questionId}/options/`
        );
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

app.post(
  "/elections/:electionId/questions/:questionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      if (request.body.quesName.length < 3) {
        request.flash("error", "Question must be alteast 3 characters");
        return response.redirect(
          `/elections/${request.params.electionId}/questions/${request.params.questionId}/modify`
        );
      }
      const questionexist = await Create_question.findquestion(
        request.params.electionId,
        request.body.quesName
      );
      if (questionexist) {
        request.flash("error", "Question already exists");
        return response.redirect(
          `/elections/${request.params.electionId}/questions/${request.params.questionId}/modify`
        );
      }
      try {
        await Create_question.modifyquestion(
          request.body.quesName,
          request.body.description,
          request.params.questionId
        );
        response.redirect(`/questions/${request.params.electionId}`);
      } catch (error) {
        console.log(error);
        return;
      }
    }
  }
);

app.post(
  "/elections/:electionId/questions/:questionId/options/:optionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      try {
        await Create_options.modifyoption(
          request.body.optionName,
          request.params.optionId
        );
        response.redirect(
          `/displayelections/correspondingquestion/${request.params.electionId}/${request.params.questionId}/options`
        );
      } catch (error) {
        console.log(error);
        return;
      }
    }
  }
);

app.post(
  "/vote/:url",
  passport.authenticate("voter-local", {
    failureRedirect: "back",
    failureFlash: true,
  }),
  async (request, response) => {
    return response.redirect(`/vote/${request.params.url}`);
  }
);

app.post(
  "/createvoter/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      if (request.body.voterId.length == 0) {
        request.flash("error", "Empty Voter Id");
        return response.redirect(`/createvoter/${request.params.id}`);
      }
      if (request.body.password.length == 0) {
        request.flash("error", "Empty Password");
        return response.redirect(`/createvoter/${request.params.id}`);
      }
      if (request.body.password.length < 3) {
        request.flash("error", "Password must be atleast 3 characters");
        return response.redirect(`/createvoter/${request.params.id}`);
      }
      const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
      try {
        await Create_voterId.add(
          request.body.voterId,
          hashedPwd,
          request.params.id
        );
        return response.redirect(`/voters/${request.params.id}`);
      } catch (error) {
        console.log(error);
        request.flash("error", "VoterId is already exists");
        request.flash("error", "Kindly Use different VoterId");
        return response.redirect(`/createvoter/${request.params.id}`);
      }
    }
  }
);

app.post(
  "/elections/:electionId/voter/:voterId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      try {
        await Create_voterId.modifypassword(
          request.params.voterId,
          request.body.password
        );
        response.redirect(`/voters/${request.params.electionId}`);
      } catch (error) {
        console.log(error);
        return;
      }
    }
  }
);

app.post("/:electionId/externalpage/:publicurl", async (request, response) => {
  try {
    let election = await Create_election.findByPk(request.params.electionId);
    let questionslist = await Create_question.retrievequestion(election.id);
    for (let i = 0; i < questionslist.length; i++) {
      let questionid = `question-${questionslist[i].id}`;
      let chossedoption = request.body[questionid];
      await Answers.addResponse({
        ElectionId: request.params.electionId,
        QuestionId: questionslist[i].id,
        VoterId: request.user.id,
        chossedoption: chossedoption,
      });
    }
    await Create_voterId.votecompleted(request.user.id);
    return response.render("finalpage");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete(
  "/deletequestion/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      try {
        const res = await Create_question.removequestion(request.params.id);
        return response.json({ success: res === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

app.delete(
  "/:id/deleteoptions",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      try {
        const res = await Create_options.removeoptions(request.params.id);
        return response.json({ success: res === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

app.delete(
  "/:id/voterdelete",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.persona === "Admins") {
      try {
        const res = await Create_voterId.delete(request.params.id);
        return response.json({ success: res === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

module.exports = app;
