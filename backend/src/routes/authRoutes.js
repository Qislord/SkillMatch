const express = require("express");
const multer = require("multer");
const {
  login,
  logout,
  me,
  register,
  updateProfile,
  uploadAvatar,
  getBookings,
  cancelBooking,
} = require("../controllers/authController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.put("/profile", updateProfile);
router.post("/avatar", upload.single("avatar"), uploadAvatar);
router.get("/me", me);
router.get("/bookings", getBookings);
router.delete("/bookings/:id", cancelBooking);

module.exports = router;
