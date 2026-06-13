const Event = require("../models/Event");
const Registration = require("../models/Registration");

const defaultVenueMap = (venue) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue || "Amrita University")}`;
const isValidUrl = (value) => {
  try {
    const parsed = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(parsed.protocol);
  } catch (error) {
    return false;
  }
};

const serializeEvent = (event, registrationCount = 0) => ({
  _id: event._id,
  id: event._id,
  title: event.title,
  description: event.description,
  category: event.category,
  date: event.date,
  startTime: event.startTime || event.time,
  time: event.startTime || event.time,
  endTime: event.endTime,
  venue: event.venue,
  venueMap: event.venueMap || defaultVenueMap(event.venue),
  mapsUrl: event.venueMap || defaultVenueMap(event.venue),
  image: event.image,
  registrationCount,
  createdAt: event.createdAt
});

const getEvents = async (req, res, next) => {
  try {
    const events = await Event.find().sort({ date: 1, time: 1 });
    const counts = await Registration.aggregate([
      { $group: { _id: "$eventId", count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
    return res.json(events.map((event) => serializeEvent(event, countMap.get(String(event._id)) || 0)));
  } catch (error) {
    return next(error);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }
    const registrationCount = await Registration.countDocuments({ eventId: event._id });
    return res.json(serializeEvent(event, registrationCount));
  } catch (error) {
    return next(error);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, startTime, time, endTime, venue, venueMap, category, image } = req.body;
    const resolvedStartTime = startTime || time;
    if (!title || !description || !date || !resolvedStartTime || !venue || !venueMap || !category) {
      return res.status(400).json({ message: "All event fields except image are required, including venue map URL." });
    }
    if (!isValidUrl(venueMap)) {
      return res.status(400).json({ message: "Enter a valid Venue Map URL." });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      date,
      startTime: resolvedStartTime,
      time: resolvedStartTime,
      endTime: String(endTime || "").trim(),
      venue: venue.trim(),
      venueMap: venueMap.trim(),
      category,
      image: String(image || "").trim(),
      createdBy: req.user.userId
    });

    return res.status(201).json(serializeEvent(event));
  } catch (error) {
    return next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const { title, description, date, startTime, time, endTime, venue, venueMap, category, image } = req.body;
    if (venueMap !== undefined && !isValidUrl(venueMap)) {
      return res.status(400).json({ message: "Enter a valid Venue Map URL." });
    }
    const resolvedStartTime = startTime || time;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        title: title?.trim(),
        description: description?.trim(),
        date,
        startTime: resolvedStartTime,
        time: resolvedStartTime,
        endTime: String(endTime || "").trim(),
        venue: venue?.trim(),
        venueMap: venueMap?.trim(),
        category,
        image: String(image || "").trim()
      },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const registrationCount = await Registration.countDocuments({ eventId: event._id });
    return res.json(serializeEvent(event, registrationCount));
  } catch (error) {
    return next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }
    return res.json({ message: "Event deleted successfully." });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};
