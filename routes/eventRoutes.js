const express = require("express");

const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
} = require("../controllers/eventController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", getEvents);
router.get("/:id", getEventById);
router.post("/", protect, authorizeRoles("admin"), createEvent);
router.put("/:id", protect, authorizeRoles("admin"), updateEvent);
router.delete("/:id", protect, authorizeRoles("admin"), deleteEvent);

module.exports = router;
