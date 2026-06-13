const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  studentEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
