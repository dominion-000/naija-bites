require("dotenv").config();
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { attachSession } = require("./domain/sessionStore");
const { greeting } = require("./domain/chatEngine");
const chatRoutes = require("./routes/chat");
const paymentRoutes = require("./routes/payment");
const webhookHandler = require("./routes/webhook");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(morgan("dev")); // HTTP access logs

// Must be mounted BEFORE express.json().
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler,
);

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

app.use("/api/chat", chatRoutes);
app.use("/api/payment", paymentRoutes);

module.exports = app;
