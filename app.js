/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const express = require("express");
const app = express();
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const { Admin, Election, questions, options, Voters } = require("./models");
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
      Voters.findOne({
        where: { voterid: username },
      })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Id or Password" });
          }
        })
        .catch(() => {
          return done(null, false, {
            message: "Invalid Id or Password",
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
      title: "Online Voting App",
    });
  }
});

app.get(
  "/index",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("index", {
      title: "Online Voting App",
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
            title: "Online Voting App",
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
        title: "Create an Election",
        csrfToken: request.csrfToken(),
      });
    }
  }
);

app.post(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      if (request.body.electionName.length === 0) {
        request.flash("error", "Empty Election");
        return response.redirect("/create");
      }
      if (request.body.publicurl.length === 0) {
        request.flash("error", "Empty publicurl");
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
        request.flash("error", "URL Already Exists");
        console.log(error);
        return response.redirect("/create");
      }
    }
  }
);

app.get("/signup", (request, response) => {
  try {
    response.render("signup", {
      title: "Create admin Account",
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
    request.flash("success", "Signout Successfully");
    response.redirect("/");
  });
});

app.get("/login", (request, response) => {
  if (request.user) {
    return response.redirect("/elections");
  }
  response.render("login", {
    title: "Login As Admin",
    csrfToken: request.csrfToken(),
  });
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
      if (!election.launched) {
        request.flash("error", "Election is live can't modify questions");
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
        request.flash("error", "Empty Question");
        return response.redirect(`/questionscreate/${request.params.id}`);
      }
      if (request.body.questionname < 3) {
        request.flash("error", "Question must be at least 3 characters");
        return response.redirect(`/questionscreate/${request.params.id}`);
      }

      const questionexist = await questions.findquestion(
        request.params.id,
        request.body.questionname
      );
      if (questionexist) {
        request.flash("error", "Question already exits");
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

app.post("/admin", async (request, response) => {
  if (request.body.email.length == 0) {
    request.flash("error", "Empty Email");
    return response.redirect("/signup");
  }
  if (request.body.firstName.length == 0) {
    request.flash("error", "Empty Firstname");
    return response.redirect("/signup");
  }
  if (request.body.password.length == 0) {
    request.flash("error", "Empty password");
    return response.redirect("/signup");
  }
  if (request.body.password.length <= 5) {
    request.flash("error", "Password must be atleast 6 characters");
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
        request.flash("success", "Signup Successfully");
        response.redirect("/elections");
      }
    });
  } catch (error) {
    console.log(error);
    request.flash("error", "User Already Exists");
    return response.redirect("/signup");
  }
});

app.post(
  "/elections/:electionId/questions/:questionId/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      if (request.body.questionname.length < 3) {
        request.flash("error", "Question must be atleast 3 characters");
        return response.redirect(
          `/elections/${request.params.electionId}/questions/${request.params.questionId}/modify`
        );
      }
      const questionexist = await questions.findquestion(
        request.params.electionId,
        request.body.questionname
      );
      if (questionexist) {
        request.flash("error", "Question already exixts");
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

app.post(
  "/createvoter/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      if (request.body.voterid.length == 0) {
        request.flash("error", "Empty VoterId");
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
        await Voters.add(request.body.voterid, hashedPwd, request.params.id);
        return response.redirect(`/voters/${request.params.id}`);
      } catch (error) {
        console.log(error);
        request.flash("error", "VoterId already exixts");
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

module.exports = app;
