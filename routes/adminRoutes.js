const express = require("express");

const { getAdminRegistrations } = require("../controllers/registrationController");
const { getAdminMessages, replyToMessage } = require("../controllers/contactController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/registrations", protect, authorizeRoles("admin"), getAdminRegistrations);
router.get("/messages", protect, authorizeRoles("admin"), getAdminMessages);
router.put("/messages/:id/reply", protect, authorizeRoles("admin"), replyToMessage);

module.exports = router;
