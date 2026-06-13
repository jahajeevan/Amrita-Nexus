const Event = require("../models/Event");
const Registration = require("../models/Registration");
const User = require("../models/User");

const toTicketId = (registrationId) => `ANX-${String(registrationId).slice(-8).toUpperCase()}`;
const mapsUrlForVenue = (venue) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
const serializeRegistration = (item) => ({
  id: item._id,
  timestamp: item.timestamp,
  ticketId: toTicketId(item._id),
  department: item.department,
  student: item.userId ? {
    id: item.userId._id,
    name: item.studentName || item.userId.name,
    email: item.studentEmail || item.userId.email
  } : {
    id: null,
    name: item.studentName,
    email: item.studentEmail
  },
  event: item.eventId ? {
    id: item.eventId._id,
    title: item.eventId.title,
    description: item.eventId.description,
    date: item.eventId.date,
    time: item.eventId.time,
    endTime: item.eventId.endTime,
    venue: item.eventId.venue,
    category: item.eventId.category,
    image: item.eventId.image,
    mapsUrl: mapsUrlForVenue(item.eventId.venue)
  } : null
});

const registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { name, department } = req.body;
    if (!name?.trim() || !department?.trim()) {
      return res.status(400).json({ message: "Student name and department are required." });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const existingRegistration = await Registration.findOne({
      userId: req.user.userId,
      eventId
    });

    if (existingRegistration) {
      return res.status(400).json({ message: "You have already registered for this event." });
    }

    const registration = await Registration.create({
      userId: req.user.userId,
      eventId,
      studentName: name.trim(),
      studentEmail: req.user.email,
      department: department.trim()
    });

    await registration.populate([
      { path: "userId", select: "name email" },
      { path: "eventId", select: "title description date time endTime venue category image" }
    ]);

    return res.status(201).json({
      message: "Event registration completed successfully.",
      registration: serializeRegistration(registration)
    });
  } catch (error) {
    return next(error);
  }
};

const getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ userId: req.user.userId })
      .populate("eventId")
      .sort({ timestamp: -1 });

    return res.json(registrations.map(serializeRegistration));
  } catch (error) {
    return next(error);
  }
};

const getLeaderboard = async (req, res, next) => {
  try {
    const leaderboard = await Registration.aggregate([
      {
        $group: {
          _id: "$userId",
          registrations: { $sum: 1 },
          lastRegisteredAt: { $max: "$timestamp" }
        }
      },
      { $sort: { registrations: -1, lastRegisteredAt: -1 } },
      { $limit: 10 }
    ]);

    const userIds = leaderboard.map((entry) => entry._id);
    const users = await User.find({ _id: { $in: userIds } }).select("name email");
    const userMap = new Map(users.map((user) => [String(user._id), user]));

    return res.json(leaderboard.map((entry, index) => ({
      rank: index + 1,
      registrations: entry.registrations,
      lastRegisteredAt: entry.lastRegisteredAt,
      student: userMap.has(String(entry._id)) ? {
        id: userMap.get(String(entry._id))._id,
        name: userMap.get(String(entry._id)).name,
        email: userMap.get(String(entry._id)).email
      } : null
    })));
  } catch (error) {
    return next(error);
  }
};

const getAdminRegistrations = async (req, res, next) => {
  try {
    const [registrations, eventCount, userCount, registrationCount] = await Promise.all([
      Registration.find()
        .populate("userId", "name email role")
        .populate("eventId", "title date time endTime venue category")
        .sort({ timestamp: -1 }),
      Event.countDocuments(),
      User.countDocuments({ role: "student", verified: true }),
      Registration.countDocuments()
    ]);

    return res.json({
      summary: {
        events: eventCount,
        users: userCount,
        registrations: registrationCount
      },
      registrations: registrations.map(serializeRegistration)
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerForEvent,
  getMyRegistrations,
  getLeaderboard,
  getAdminRegistrations
};
