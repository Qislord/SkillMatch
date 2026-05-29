const express = require("express");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config({
  path: "../.env",
});
const authRoutes = require("./routes/authRoutes");
const mentorRoutes = require("./routes/mentorRoutes");
const { createUsersTableIfNotExists } = require("./services/authService");
const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "dev-session-secret-change-me";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

createUsersTableIfNotExists().catch((error) => {
  console.error("Failed to ensure users table exists:", error);
});

app.use("/api/auth", authRoutes);
app.use("/api/mentor", mentorRoutes);

app.get("/", (req, res) => {
  res.send("Привет от бэкенда на Node.js!");
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    message: error.message || "Внутренняя ошибка сервера",
  });
});

module.exports = app;
