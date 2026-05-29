const express = require("express");
const multer = require("multer");
const {
  uploadPortfolio,
  removePortfolio,
  createSession,
  listSessions,
  deleteSession,
} = require("../controllers/mentorController");
const {
  listPublicMentors,
  getPublicMentor,
  bookSession,
  leaveReview,
  deleteReview,
} = require("../controllers/publicMentorController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
});

router.post("/portfolio", upload.array("images", 8), uploadPortfolio);
router.delete("/portfolio/:id", removePortfolio);

router.post("/sessions", createSession);
router.get("/sessions", listSessions);
router.delete("/sessions/:id", deleteSession);

// public endpoints
router.get("/", listPublicMentors);
router.get("/:id", getPublicMentor);
router.post("/:id/review", leaveReview);
router.delete("/:id/review", deleteReview);
router.post("/sessions/:id/book", bookSession);

module.exports = router;
