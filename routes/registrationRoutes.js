const express = require("express");

const {
  registerForEvent,
  getMyRegistrations,
  getLeaderboard
} = require("../controllers/registrationController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/leaderboard", getLeaderboard);
router.post("/:eventId", protect, authorizeRoles("student"), registerForEvent);
router.get("/mine/list", protect, authorizeRoles("student"), getMyRegistrations);

module.exports = router;
