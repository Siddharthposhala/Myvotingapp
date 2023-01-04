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
            return done(null, false, { message: "Invalid Password!!!" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Invalid Email-ID!!!!" });
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
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch(() => {
          return done(null, false, {
            message: "invalid ID",
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
    Administrator.findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  } else if (id.case === "voters") {
    Create_voterId.findByPk(id.id)
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
    if (request.user.case === "admins") {
      response.render("new", {
        title: "Create an election",
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
        request.flash("error", "election name can not be empty!!");
        return response.redirect("/create");
      }
      if (request.body.publicurl.length === 0) {
        request.flash("error", "public url can not be empty!!");
        return response.redirect("/create");
      }

      try {
        await Create_election.addElections({
          electionName: request.body.electionName,
          publicurl: request.body.publicurl,
          adminID: request.user.id,
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
app.get(
  "/listofelections/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
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
      // eslint-disable-next-line no-unused-vars
      const electionlist = await Create_election.getElections(
        request.params.id,
        request.user.id
      );
      const questions1 = await Create_question.retrievequestions(
        request.params.id
      );
      const election = await Create_election.findByPk(request.params.id);
      if (Create_election.launched) {
        request.flash(
          "error",
          "Can not modify question while election is running!!"
        );
        return response.redirect(`/listofelections/${request.params.id}`);
      }
      if (request.accepts("html")) {
        response.render("questions", {
          title: Create_election.electionName,
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

      const questionexist = await Create_question.findquestion(
        request.params.id,
        request.body.questionname
      );
      if (questionexist) {
        request.flash("error", "Sorry!! the question already used");
        return response.redirect(`/questionscreate/${request.params.id}`);
      }

      try {
        const question = await Create_question.addquestion({
          electionID: request.params.id,
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
  "/displayelections/correspondingquestion/:id/:questionID/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        const question = await Create_question.retrievequestion(
          request.params.questionID
        );
        const option = await Create_options.retrieveoptions(
          request.params.questionID
        );
        if (request.accepts("html")) {
          response.render("questiondisplay", {
            title: question.questionname,
            description: question.description,
            id: request.params.id,
            questionID: request.params.questionID,
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
        const res = await Create_question.removequestion(request.params.id);
        return response.json({ success: res === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);

app.post(
  "/displayelections/correspondingquestion/:id/:questionID/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      if (!request.body.optionname) {
        request.flash("error", "Option can not be empty");
        return response.redirect(
          `/displayelections/correspondingquestion/${request.params.id}/${request.params.questionID}/options`
        );
      }
      try {
        await Create_options.addoption({
          optionname: request.body.optionname,
          questionID: request.params.questionID,
        });
        return response.redirect(
          `/displayelections/correspondingquestion/${request.params.id}/${request.params.questionID}/options/`
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
        const res = await Create_options.removeoptions(request.params.id);
        return response.json({ success: res === 1 });
      } catch (error) {
        console.log(error);
        return response.status(422).json(error);
      }
    }
  }
);
app.get(
  "/elections/:electionID/questions/:questionID/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      const adminID = request.user.id;
      const admin = await Administrator.findByPk(adminID);
      const election = await Create_election.findByPk(
        request.params.electionID
      );
      const Question = await Create_question.findByPk(
        request.params.questionID
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
app.post(
  "/elections/:electionID/questions/:questionID/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      if (request.body.questionname.length < 3) {
        request.flash(
          "error",
          "Question can not be less than three characters"
        );
        return response.redirect(
          `/elections/${request.params.electionID}/questions/${request.params.questionID}/modify`
        );
      }
      const questionexist = await Create_question.findquestion(
        request.params.electionID,
        request.body.questionname
      );
      if (questionexist) {
        request.flash("error", "Sorry!! the question already used");
        return response.redirect(
          `/elections/${request.params.electionID}/questions/${request.params.questionID}/modify`
        );
      }
      try {
        await Create_question.modifyquestion(
          request.body.questionname,
          request.body.description,
          request.params.questionID
        );
        response.redirect(`/questions/${request.params.electionID}`);
      } catch (error) {
        console.log(error);
        return;
      }
    }
  }
);
app.get(
  "/elections/:electionID/questions/:questionID/options/:optionID/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      const adminID = request.user.id;
      const admin = await Administrator.findByPk(adminID);
      const election = await Create_election.findByPk(
        request.params.electionID
      );
      const Question = await Create_question.findByPk(
        request.params.questionID
      );
      const option = await Create_options.findByPk(request.params.optionID);
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
  "/elections/:electionID/questions/:questionID/options/:optionID/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        await Create_options.modifyoption(
          request.body.optionname,
          request.params.optionID
        );
        response.redirect(
          `/displayelections/correspondingquestion/${request.params.electionID}/${request.params.questionID}/options`
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
      // eslint-disable-next-line no-unused-vars
      const electionlist = await Create_election.getElections(
        request.params.id,
        request.user.id
      );
      const voterlist = await Create_voterId.retrivevoters(request.params.id);
      const election = await Create_election.findByPk(request.params.id);
      if (request.accepts("html")) {
        response.render("voters", {
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
  if (request.user.case === "admins") {
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
      const election = await Create_election.getElections(
        request.params.id,
        request.user.id
      );
      const ele = await Create_election.findByPk(request.params.id);
      const countofquestions = await Create_question.countquestions(
        request.params.id
      );
      const countofvoters = await Create_voterId.countvoters(request.params.id);
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
      const voterslist = await Create_voterId.retrivevoters(request.params.id);
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
        request.flash("error", "Voter ID Can not be null!!");
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
        await Create_voterId.add(
          request.body.voterid,
          hashedPwd,
          request.params.id
        );
        return response.redirect(`/voters/${request.params.id}`);
      } catch (error) {
        console.log(error);
        request.flash(
          "error",
          "Sorry!! It Seems like VoterID is already in Use"
        );
        request.flash("error", "Kindly Use different VoterID");
        return response.redirect(`/createvoter/${request.params.id}`);
      }
    }
  }
);

app.get(
  "/elections/:electionID/voter/:voterID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      const election = await Create_election.findByPk(
        request.params.electionID
      );
      const voter = await Create_voterId.findByPk(request.params.voterID);
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
  "/elections/:electionID/voter/:voterID/modify",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        await Create_voterId.modifypassword(
          request.params.voterID,
          request.body.password
        );
        response.redirect(`/voters/${request.params.electionID}`);
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
        const res = await Create_voterId.delete(request.params.id);
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
      const question = await Create_question.findAll({
        where: { electionID: request.params.id },
      });
      if (question.length <= 1) {
        request.flash(
          "error",
          "Please add atleast two question in the ballot!!"
        );
        return response.redirect(`/listofelections/${request.params.id}`);
      }

      for (let i = 0; i < question.length; i++) {
        const option = await Create_options.retrieveoptions(question[i].id);
        if (option.length <= 1) {
          request.flash(
            "error",
            "Kindly add atleast two options to the question!!!"
          );
          return response.redirect(`/listofelections/${request.params.id}`);
        }
      }

      const voters = await Create_voterId.retrivevoters(request.params.id);
      if (voters.length <= 1) {
        request.flash(
          "error",
          "There should be atleast two voter to lauch election"
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
    if (request.user.case === "admins") {
      const election = await Create_election.findByPk(request.params.id);
      const optionsnew = [];
      const question = await Create_question.retrievequestions(
        request.params.id
      );

      for (let i = 0; i < question.length; i++) {
        const optionlist = await Create_options.retrieveoptions(question[i].id);
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
    const election = await Create_election.getElectionurl(
      request.params.publicurl
    );
    return response.render("voterlogin", {
      publicurl: election.publicurl,
      csrfToken: request.csrfToken(),
    });
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});
app.get("/vote/:publicurl/", async (request, response) => {
  if (request.user === false) {
    request.flash("error", "Kindly login before casting vote");
    return response.redirect(`/externalpage/${request.params.publicurl}`);
  }
  const election = await Create_election.getElectionurl(
    request.params.publicurl
  );

  if (request.user.voted && election.launched) {
    return response.redirect(`/vote/${request.params.publicurl}/endpage`);
  }

  try {
    const election = await Create_election.getElectionurl(
      request.params.publicurl
    );
    if (request.user.case === "voters") {
      if (election.launched) {
        const question = await Create_question.retrievequestions(election.id);
        let optionsnew = [];
        for (let i = 0; i < question.length; i++) {
          const optionlist = await Create_options.retrieveoptions(
            question[i].id
          );
          optionsnew.push(optionlist);
        }

        return response.render("voterview", {
          publicurl: request.params.publicurl,
          id: election.id,
          title: election.electionName,
          electionID: election.id,
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

app.post("/:electionID/externalpage/:publicurl", async (request, response) => {
  try {
    let election = await Create_election.findByPk(request.params.electionID);
    let questionslist = await Create_question.retrievequestion(election.id);
    for (let i = 0; i < questionslist.length; i++) {
      let questionid = `question-${questionslist[i].id}`;
      let chossedoption = request.body[questionid];
      await Answers.addResponse({
        ElectionID: request.params.electionID,
        QuestionID: questionslist[i].id,
        VoterID: request.user.id,
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

module.exports = app;
