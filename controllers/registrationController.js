const Event = require("../models/Event");
const Registration = require("../models/Registration");
const User = require("../models/User");

const toTicketId = (registrationId) => `ANX-${String(registrationId).slice(-8).toUpperCase()}`;
const mapsUrlForVenue = (venue) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue || "Amrita University")}`;
const eventIdFor = (event) => event?._id || event?.id || null;
const populatedEventFor = (item) => (item.eventId && typeof item.eventId === "object" && item.eventId.title ? item.eventId : null);
const serializeRegistration = (item) => {
  const event = populatedEventFor(item);
  return ({
  _id: item._id,
  id: item._id,
  eventId: eventIdFor(event) || item.eventId,
  eventName: item.eventName || event?.title || "",
  fullName: item.fullName || item.studentName,
  rollNumber: item.rollNumber || "",
  department: item.department,
  year: item.year || "",
  email: item.email || item.studentEmail,
  phone: item.phone || "",
  registrationDate: item.registrationDate || item.timestamp,
  timestamp: item.registrationDate || item.timestamp,
  registrationId: toTicketId(item._id),
  ticketId: toTicketId(item._id),
  department: item.department,
  student: item.userId ? {
    id: item.userId._id,
    name: item.fullName || item.studentName || item.userId.name,
    email: item.email || item.studentEmail || item.userId.email,
    rollNumber: item.rollNumber || "",
    year: item.year || "",
    phone: item.phone || ""
  } : {
    id: null,
    name: item.fullName || item.studentName,
    email: item.email || item.studentEmail,
    rollNumber: item.rollNumber || "",
    year: item.year || "",
    phone: item.phone || ""
  },
  event: event ? {
    _id: event._id,
    id: event._id,
    title: event.title,
    description: event.description,
    date: event.date,
    startTime: event.startTime || event.time,
    time: event.startTime || event.time,
    endTime: event.endTime,
    venue: event.venue,
    venueMap: event.venueMap || mapsUrlForVenue(event.venue),
    category: event.category,
    image: event.image,
    mapsUrl: event.venueMap || mapsUrlForVenue(event.venue)
  } : null
  });
};

const registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { fullName, name, rollNumber, department, year, email, phone } = req.body;
    const resolvedName = fullName || name;
    const resolvedEmail = String(email || req.user.email || "").trim().toLowerCase();
    if (!resolvedName?.trim() || !rollNumber?.trim() || !department?.trim() || !year?.trim() || !resolvedEmail || !phone?.trim()) {
      return res.status(400).json({ message: "Full name, roll number, department, year, email, and phone number are required." });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const existingRegistration = await Registration.findOne({
      email: resolvedEmail,
      eventId
    });

    if (existingRegistration) {
      return res.status(409).json({ message: "This email is already registered for this event." });
    }

    const registration = await Registration.create({
      userId: req.user.userId,
      eventId,
      eventName: event.title,
      fullName: resolvedName.trim(),
      rollNumber: rollNumber.trim(),
      department: department.trim(),
      year: year.trim(),
      email: resolvedEmail,
      phone: phone.trim(),
      registrationDate: new Date(),
      studentName: resolvedName.trim(),
      studentEmail: resolvedEmail
    });

    await registration.populate([
      { path: "userId", select: "name email" },
      { path: "eventId", select: "title description date startTime time endTime venue venueMap category image" }
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
      .sort({ registrationDate: -1, timestamp: -1 });

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
        .populate("eventId", "title date startTime time endTime venue venueMap category")
        .sort({ registrationDate: -1, timestamp: -1 }),
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
