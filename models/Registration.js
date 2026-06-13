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
  eventName: {
    type: String,
    required: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  studentName: {
    type: String,
    trim: true
  },
  studentEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

registrationSchema.pre("validate", function syncLegacyStudentFields(next) {
  if (!this.studentName && this.fullName) this.studentName = this.fullName;
  if (!this.studentEmail && this.email) this.studentEmail = this.email;
  if (!this.timestamp && this.registrationDate) this.timestamp = this.registrationDate;
  next();
});

registrationSchema.index({ email: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
