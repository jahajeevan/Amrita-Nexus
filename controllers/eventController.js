const Event = require("../models/Event");

const normalizeVenueMap = (venue) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
const serializeEvent = (event) => ({
  id: event._id,
  title: event.title,
  description: event.description,
  date: event.date,
  time: event.time,
  endTime: event.endTime,
  venue: event.venue,
  category: event.category,
  image: event.image,
  mapsUrl: normalizeVenueMap(event.venue)
});

const getEvents = async (req, res, next) => {
  try {
    const events = await Event.find().sort({ date: 1, time: 1 });
    return res.json(events.map(serializeEvent));
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
    return res.json(serializeEvent(event));
  } catch (error) {
    return next(error);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const { title, description, date, time, endTime, venue, category, image } = req.body;
    if (!title || !description || !date || !time || !venue || !category) {
      return res.status(400).json({ message: "All event fields except image are required." });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      endTime: String(endTime || "").trim(),
      venue: venue.trim(),
      category,
      image: String(image || "").trim(),
      createdBy: req.user.userId
    });

    return res.status(201).json(event);
  } catch (error) {
    return next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const { title, description, date, time, endTime, venue, category, image } = req.body;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        title: title?.trim(),
        description: description?.trim(),
        date,
        time,
        endTime: String(endTime || "").trim(),
        venue: venue?.trim(),
        category,
        image: String(image || "").trim()
      },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    return res.json(event);
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
