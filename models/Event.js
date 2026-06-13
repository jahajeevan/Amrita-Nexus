const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  time: { type: String, default: "09:00" },
  endTime: { type: String, default: "" },
  venue: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ["Tech", "Cultural", "Sports", "Expo"],
    default: "Tech"
  },
  image: { type: String, default: "" },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Event", eventSchema);
