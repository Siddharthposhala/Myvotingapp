/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const express = require("express");
const app = express();
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const {
  Admin,
  Election,
  questions,
  options,
  Voters,
  Answers,
} = require("./models");
const bodyParser = require("body-parser");
const connectEnsureLogin = require("connect-ensure-login");
const LocalStratergy = require("passport-local");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const { AsyncLocalStorage } = require("async_hooks");
const flash = require("connect-flash");
const election = require("./models/election");
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
      Admin.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password!!!" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Invalid Email-Id!!!!" });
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
      Voters.findOne({
        where: { voterid: username },
      })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch(() => {
          return done(null, false, {
            message: "invalid Id",
          });
        });
    }
  )
);
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
passport.serializeUser((user, done) => {
  done(null, { id: user.id, case: user.case });
});
passport.deserializeUser((id, done) => {
  if (id.case === "admins") {
    Admin.findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  } else if (id.case === "voters") {
    Voters.findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
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

app.get("/", (request, response) => {
  if (request.user) {
    if (request.user.case === "admins") {
      return response.redirect("/elections");
    } else if (request.user.case === "voters") {
      request.logout((err) => {
        if (err) {
          return response.json(err);
        }
        response.redirect("/");
      });
    }
  } else {
    response.render("index", {
      title: "Welcom To Online Voting Platform",
    });
  }
});

app.get(
  "/index",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("index", {
      title: "Online Voting interface",
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      let user = await Admin.findByPk(request.user.id);
      let username = user.dataValues.firstName;
      try {
        const elections_list = await Election.getElections(request.user.id);
        if (request.accepts("html")) {
          response.render("elections", {
            title: "Online Voting interface",
            user,
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
    } else if (request.user.case === "voter") {
      return response.redirect("/");
    }
  }
);
app.get(
  "/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      response.render("new", {
        title: "Create an election",
        csrfToken: request.csrfToken(),
      });
    }
    if (request.user.case === "voters") {
      return response.redirect("/");
    }
  }
);

app.post(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      if (request.body.electionName.length === 0) {
        request.flash("error", "election name can not be empty!!");
        return response.redirect("/create");
      }
      if (request.body.publicurl.length === 0) {
        request.flash("error", "public url can not be empty!!");
        return response.redirect("/create");
      }

      try {
        await Election.addElections({
          electionName: request.body.electionName,
          publicurl: request.body.publicurl,
          adminId: request.user.id,
        });
        return response.redirect("/elections");
      } catch (error) {
        request.flash("error", "URL is already Used!!");
        console.log(error);
        return response.redirect("/create");
      }
    } else if (request.user.role === "voter") {
      return response.redirect("/");
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
    request.flash("success", "Signout successfully!!");
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

app.post("/admin", async (request, response) => {
  if (request.body.email.length == 0) {
    request.flash("error", "email can not be empty!!");
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
    const user = await Admin.create({
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
        request.flash("success", "Signup successfully!!");
        response.redirect("/elections");
      }
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "User Already Exist with this mail!!");
    return response.redirect("/signup");
  }
});

app.get(
  "/listofelections/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        const election = await Election.findByPk(request.params.id);
        const voter = await Voters.retrivevoters(request.params.id);
        const question = await questions.retrievequestion(request.params.id);
        await Election.getElections(request.params.id, request.user.id);
        const countofquestions = await questions.countquestions(
          request.params.id
        );
        const countofvoters = await Voters.countvoters(request.params.id);
        response.render("election_page", {
          election: election,
          publicurl: election.publicurl,
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
    if (request.user.case === "admins") {
      await Election.getElections(request.params.id, request.user.id);
      const questions1 = await questions.retrievequestions(request.params.id);
      const election = await Election.findByPk(request.params.id);
      if (election.launched) {
        request.flash(
          "error",
          "Can not modify question while election is running!!"
        );
        return response.redirect(`/listofelections/${request.params.id}`);
      }
      if (request.accepts("html")) {
        response.render("questions", {
          title: election.electionName,
          id: request.params.id,
          questions: questions1,
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
    if (request.user.case === "admins") {
      response.render("createquestion", {
        id: request.params.id,
        csrfToken: request.csrfToken(),
      });
    }
  }
);

app.post(
  "/questionscreate/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      if (!request.body.questionname) {
        request.flash("error", "Question can not be empty!!");
        return response.redirect(`/questionscreate/${request.params.id}`);
      }
      if (request.body.questionname < 3) {
        request.flash("error", "Question can not be less than 3 words!!");
        return response.redirect(`/questionscreate/${request.params.id}`);
      }

      const questionexist = await questions.findquestion(
        request.params.id,
        request.body.questionname
      );
      if (questionexist) {
        request.flash("error", "Sorry!! the question already used");
        return response.redirect(`/questionscreate/${request.params.id}`);
      }

      try {
        const question = await questions.addquestion({
          electionId: request.params.id,
          questionname: request.body.questionname,
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

app.get(
  "/displayelections/correspondingquestion/:id/:questionId/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        const question = await questions.retrievequestion(
          request.params.questionId
        );
        const option = await options.retrieveoptions(request.params.questionId);
        if (request.accepts("html")) {
          response.render("questiondisplay", {
            title: question.questionname,
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

app.delete(
  "/deletequestion/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        const res = await questions.removequestion(request.params.id);
        return response.json({ success: res === 1 });
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
    if (request.user.case === "admins") {
      if (!request.body.optionname) {
        request.flash("error", "Option can not be empty");
        return response.redirect(
          `/displayelections/correspondingquestion/${request.params.id}/${request.params.questionId}/options`
        );
      }
      try {
        await options.addoption({
          optionname: request.body.optionname,
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

app.delete(
  "/:id/deleteoptions",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        const res = await options.removeoptions(request.params.id);
        return response.json({ success: res === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);
app.get(
  "/elections/:electionId/questions/:questionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      const adminId = request.user.id;
      const admin = await Admin.findByPk(adminId);
      const election = await Election.findByPk(request.params.electionId);
      const Question = await questions.findByPk(request.params.questionId);
      response.render("modifyquestion", {
        username: admin.name,
        election: election,
        question: Question,
        csrf: request.csrfToken(),
      });
    }
  }
);
app.post(
  "/elections/:electionId/questions/:questionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      if (request.body.questionname.length < 3) {
        request.flash(
          "error",
          "Question can not be less than three characters"
        );
        return response.redirect(
          `/elections/${request.params.electionId}/questions/${request.params.questionId}/modify`
        );
      }
      const questionexist = await questions.findquestion(
        request.params.electionId,
        request.body.questionname
      );
      if (questionexist) {
        request.flash("error", "Sorry!! the question already used");
        return response.redirect(
          `/elections/${request.params.electionId}/questions/${request.params.questionId}/modify`
        );
      }
      try {
        await questions.modifyquestion(
          request.body.questionname,
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
app.get(
  "/elections/:electionId/questions/:questionId/options/:optionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      const adminId = request.user.id;
      const admin = await Admin.findByPk(adminId);
      const election = await Election.findByPk(request.params.electionId);
      const Question = await questions.findByPk(request.params.questionId);
      const option = await options.findByPk(request.params.optionId);
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
app.post(
  "/elections/:electionId/questions/:questionId/options/:optionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        await options.modifyoption(
          request.body.optionname,
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

app.get(
  "/voters/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      await Election.getElections(request.params.id, request.user.id);
      const voterlist = await Voters.retrivevoters(request.params.id);
      const election = await Election.findByPk(request.params.id);
      if (request.accepts("html")) {
        response.render("voters", {
          title: election.electionName,
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
  if (request.user.case === "admins") {
    try {
      const electionname = await Election.getElections(
        request.params.id,
        request.user.id
      );
      const countofquestions = await questions.countquestions(
        request.params.id
      );
      const countofvoters = await Voters.countvoters(request.params.id);
      const election = await Election.findByPk(request.params.id);
      response.render("election_page", {
        publicurl: election.publicurl,
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
  if (request.user.case === "admins") {
    try {
      const election = await Election.getElections(
        request.params.id,
        request.user.id
      );
      const ele = await Election.findByPk(request.params.id);
      const countofquestions = await questions.countquestions(
        request.params.id
      );
      const countofvoters = await Voters.countvoters(request.params.id);
      response.render("election_page", {
        id: request.params.id,
        publicurl: ele.publicurl,
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
    if (request.user.case === "admins") {
      const voterslist = await Voters.retrivevoters(request.params.id);
      if (request.accepts("html")) {
        response.render("createvoter", {
          id: request.params.id,
          csrfToken: request.csrfToken({ voterslist }),
        });
      } else {
        return response.json({ voterslist });
      }
    }
  }
);

app.post(
  "/vote/:publicurl",
  passport.authenticate("voter-local", {
    failureRedirect: "back",
    failureFlash: true,
  }),
  async (request, response) => {
    return response.redirect(`/vote/${request.params.publicurl}`);
  }
);

app.post(
  "/createvoter/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      if (request.body.voterid.length == 0) {
        request.flash("error", "Voter Id Can not be null!!");
        return response.redirect(`/createvoter/${request.params.id}`);
      }
      if (request.body.password.length == 0) {
        request.flash("error", "Password can not be empty!!");
        return response.redirect(`/createvoter/${request.params.id}`);
      }
      if (request.body.password.length < 3) {
        request.flash("error", "Password length can not be less than three!!");
        return response.redirect(`/createvoter/${request.params.id}`);
      }
      const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
      try {
        await Voters.add(request.body.voterid, hashedPwd, request.params.id);
        return response.redirect(`/voters/${request.params.id}`);
      } catch (error) {
        console.log(error);
        request.flash(
          "error",
          "Sorry!! It Seems like VoterId is already in Use"
        );
        request.flash("error", "Kindly Use different VoterId");
        return response.redirect(`/createvoter/${request.params.id}`);
      }
    }
  }
);

app.get(
  "/elections/:electionId/voter/:voterId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      const election = await Election.findByPk(request.params.electionId);
      const voter = await Voters.findByPk(request.params.voterId);
      console.log(voter);
      response.render("modifyvoters", {
        voter: voter,
        election: election,
        csrf: request.csrfToken(),
      });
    }
  }
);

app.post(
  "/elections/:electionId/voter/:voterId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        await Voters.modifypassword(
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

app.delete(
  "/:id/voterdelete",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        const res = await Voters.delete(request.params.id);
        return response.json({ success: res === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

app.get(
  "/election/:id/launch",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      const question = await questions.findAll({
        where: { electionId: request.params.id },
      });
      if (question.length <= 1) {
        request.flash(
          "error",
          "Please add atleast two question in the ballot!!"
        );
        return response.redirect(`/listofelections/${request.params.id}`);
      }

      for (let i = 0; i < question.length; i++) {
        const option = await options.retrieveoptions(question[i].id);
        if (option.length <= 1) {
          request.flash(
            "error",
            "Kindly add atleast two options to the question!!!"
          );
          return response.redirect(`/listofelections/${request.params.id}`);
        }
      }

      const voters = await Voters.retrivevoters(request.params.id);
      if (voters.length <= 1) {
        request.flash(
          "error",
          "There should be atleast two voter to lauch election"
        );
        return response.redirect(`/listofelections/${request.params.id}`);
      }

      try {
        await Election.launch(request.params.id);
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
    if (request.user.case === "admins") {
      const election = await Election.findByPk(request.params.id);
      const optionsnew = [];
      const question = await questions.retrievequestions(request.params.id);

      for (let i = 0; i < question.length; i++) {
        const optionlist = await options.retrieveoptions(question[i].id);
        optionsnew.push(optionlist);
      }
      if (election.launched) {
        request.flash("error", "You can not preview election while Running");
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
    const election = await Election.getElectionurl(request.params.publicurl);
    if (election.launched && !election.ended) {
      return response.render("voterlogin", {
        publicurl: election.publicurl,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.render("resultpage");
    }
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("externalpage/:publicurl/resultpage", async (request, response) => {
  response.render("resultpage");
});

app.get("/vote/:publicurl/", async (request, response) => {
  if (request.user === false) {
    request.flash("error", "Kindly login before casting vote");
    return response.redirect(`/externalpage/${request.params.publicurl}`);
  }
  const election = await Election.getElectionurl(request.params.publicurl);

  if (request.user.voted && election.launched) {
    return response.redirect(`/vote/${request.params.publicurl}/endpage`);
  }

  try {
    const election = await Election.getElectionurl(request.params.publicurl);
    if (request.user.case === "voters") {
      if (election.launched) {
        const question = await questions.retrievequestions(election.id);
        let optionsnew = [];
        for (let i = 0; i < question.length; i++) {
          const optionlist = await options.retrieveoptions(question[i].id);
          optionsnew.push(optionlist);
        }

        return response.render("voterview", {
          publicurl: request.params.publicurl,
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
    } else if (request.user.case === "admins") {
      request.flash(
        "error",
        "Ooopss!! You can not vote as admin Signout as admin to vote.!!"
      );
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

app.post("/:electionId/externalpage/:publicurl", async (request, response) => {
  try {
    let election = await Election.findByPk(request.params.electionId);
    let questionslist = await questions.retrievequestion(election.id);
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
    await Voters.votecompleted(request.user.id);
    return response.render("finalpage");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get(
  "/election/:id/end",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        if (election.launched === false) {
          request.flash("error", "election has not launched yet!!");
          return response.redirect(`/listofelections/${request.params.id}`);
        }
        await Election.end(request.params.id);
        return response.redirect(`/listofelections/${request.params.id}`);
      } catch (error) {
        console.log(error);
        return response.send(error);
      }
    }
  }
);

app.get(
  "/adminpassword/reset",
  connectEnsureLogin.ensureLoggedIn(),
  (request, response) => {
    if (request.user.case === "admins") {
      response.render("adminpasswordreset", {
        csrfToken: request.csrfToken(),
      });
    } else if (request.user.case == "voters") {
      return response.redirect();
    }
  }
);

app.post(
  "/adminpassword/reset",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      if (!request.body.oldpassword) {
        request.flash("error", "oldpassword field can not be empty!!");
        return response.redirect("/adminpassword/reset");
      }
      if (!request.body.newpassword) {
        request.flash("error", "newpassword field can not be empty!!");
        return response.redirect("/adminpassword/reset");
      }
      if (request.body.newpassword.length <= 5) {
        request.flash("error", "password should be minimum of 6 letters");
        return response.redirect("/adminpassword/reset");
      }
      const hashnewpassword = await bcrypt.hash(
        request.body.newpassword,
        saltRounds
      );
      const compare = await bcrypt.compare(
        request.body.oldpassword,
        request.user.password
      );

      if (compare) {
        try {
          const admin = await Admin.findadmin(request.user.email);
          if (admin) {
            await Admin.updatepassword(hashnewpassword, admin.email);
            request.flash("success", "Password changed successfully");
            return response.redirect("/elections");
          }
        } catch (error) {
          return response.status(422).json(error);
        }
      } else {
        request.flash("error", "Kindly check the old password!!");
        return response.redirect("/adminpassword/reset");
      }
    }
  }
);

module.exports = app;
