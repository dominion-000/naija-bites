require("dotenv").config();
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { attachSession } = require("./domain/sessionStore");
const { greeting } = require("./domain/chatEngine");
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(morgan("dev")); // HTTP access logs

app.use(express.json());
app.use(cookieParser());
app.use(attachSession);
app.use(express.static(path.join(__dirname, "public")));

// The chat page is server-rendered.
app.get("/", (req, res) => {
  res.render("index", {
    restaurantName: "Naija Bites",
    initialMessage: greeting(),
  });
});

module.exports = app;
