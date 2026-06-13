const express = require("express");

const {
  submitContactMessage,
  getMyContactMessages
} = require("../controllers/contactController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", protect, authorizeRoles("student"), submitContactMessage);
router.get("/mine", protect, authorizeRoles("student"), getMyContactMessages);

module.exports = router;
