require("dotenv").config();
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(morgan("dev")); // HTTP access logs
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

module.exports = app;
