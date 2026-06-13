const ContactMessage = require("../models/ContactMessage");

const serializeMessage = (item) => ({
  id: item._id,
  name: item.name,
  email: item.email,
  message: item.message,
  reply: item.reply || "",
  createdAt: item.createdAt,
  repliedAt: item.repliedAt
});

const submitContactMessage = async (req, res, next) => {
  try {
    const { name, message } = req.body;
    if (!name?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Name and message are required." });
    }

    const contact = await ContactMessage.create({
      userId: req.user.userId,
      name: name.trim(),
      email: req.user.email,
      message: message.trim()
    });

    return res.status(201).json({
      message: "Your message has been sent to the admin team.",
      contact: serializeMessage(contact)
    });
  } catch (error) {
    return next(error);
  }
};

const getMyContactMessages = async (req, res, next) => {
  try {
    const items = await ContactMessage.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    return res.json(items.map(serializeMessage));
  } catch (error) {
    return next(error);
  }
};

const getAdminMessages = async (req, res, next) => {
  try {
    const items = await ContactMessage.find().sort({ createdAt: -1 });
    return res.json(items.map(serializeMessage));
  } catch (error) {
    return next(error);
  }
};

const replyToMessage = async (req, res, next) => {
  try {
    const { reply } = req.body;
    if (!reply?.trim()) {
      return res.status(400).json({ message: "Reply message is required." });
    }

    const item = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      {
        reply: reply.trim(),
        repliedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Contact message not found." });
    }

    return res.json({
      message: "Reply saved successfully.",
      contact: serializeMessage(item)
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  submitContactMessage,
  getMyContactMessages,
  getAdminMessages,
  replyToMessage
};
