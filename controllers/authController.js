const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const mailer = require("../config/mailer");
const User = require("../models/User");

const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeName = (value) => String(value || "").trim();
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const shouldPreviewOtp = () => String(process.env.DEMO_OTP_PREVIEW || "").toLowerCase() === "true";

const getAdminEmails = () => (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const isAdminEmail = (email) => getAdminEmails().includes(email);

const issueToken = (user) => jwt.sign(
  {
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

const sendOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    if (isAdminEmail(email)) {
      return res.status(400).json({ message: "Admin uses the separate email and password login." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser?.verified) {
      return res.status(400).json({ message: "Account already exists. Please log in with your password." });
    }

    const otp = generateOtp();
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + OTP_TTL_MS,
      verified: false
    });

    if (shouldPreviewOtp()) {
      return res.json({
        message: "Demo OTP generated successfully.",
        previewOtp: otp
      });
    }

    try {
      await mailer.sendMail({
        from: process.env.MAIL_FROM,
        to: email,
        subject: "Amrita Nexus OTP Verification",
        html: `
          <div style="font-family:Inter,Arial,sans-serif;padding:24px;color:#111827;">
            <h2 style="margin:0 0 12px;">Amrita Nexus</h2>
            <p style="margin:0 0 18px;">Use this one-time password to verify your student email address:</p>
            <div style="font-size:32px;font-weight:700;letter-spacing:6px;margin:0 0 18px;">${otp}</div>
            <p style="margin:0;color:#4b5563;">This OTP is valid for 5 minutes.</p>
          </div>
        `
      });
    } catch (mailError) {
      throw mailError;
    }

    return res.json({ message: "OTP sent successfully to your email." });
  } catch (error) {
    if (error.code === "EAUTH" || error.responseCode === 534 || error.responseCode === 535) {
      return res.status(500).json({
        message: "Gmail SMTP sign-in was blocked. Open the sender Gmail account in a browser, complete any Google security prompt, then verify the app password and try again."
      });
    }
    return next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ message: "No OTP request found for this email." });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired. Request a new one." });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    otpStore.set(email, {
      ...record,
      verified: true
    });

    return res.json({ message: "OTP verified successfully. You can now create your password." });
  } catch (error) {
    return next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const name = normalizeName(req.body.name);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (isAdminEmail(email)) {
      return res.status(400).json({ message: "Admin account cannot be registered from the student flow." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const otpRecord = otpStore.get(email);
    if (!otpRecord?.verified || Date.now() > otpRecord.expiresAt) {
      return res.status(400).json({ message: "Email verification is required before registration." });
    }

    const existingVerifiedUser = await User.findOne({ email, verified: true });
    if (existingVerifiedUser) {
      return res.status(400).json({ message: "Account already exists. Please log in." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: hashedPassword,
        verified: true,
        role: "student"
      });
    } else {
      user.name = name;
      user.password = hashedPassword;
      user.verified = true;
      user.role = "student";
      await user.save();
    }

    otpStore.delete(email);

    return res.status(201).json({
      message: "Student account created successfully.",
      token: issueToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    if (isAdminEmail(email)) {
      if (password !== String(process.env.ADMIN_PASSWORD || "")) {
        return res.status(401).json({ message: "Invalid admin email or password." });
      }

      let adminUser = await User.findOne({ email });
      if (!adminUser) {
        adminUser = await User.create({
          name: "Admin",
          email,
          password: "",
          verified: true,
          role: "admin"
        });
      } else if (adminUser.role !== "admin") {
        adminUser.role = "admin";
        adminUser.verified = true;
        await adminUser.save();
      }

      return res.json({
        message: "Admin login successful.",
        token: issueToken(adminUser),
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role
        }
      });
    }

    const user = await User.findOne({ email, role: "student" });
    if (!user || !user.verified) {
      return res.status(404).json({ message: "Student account not found. Please sign up first." });
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({
      message: "Student login successful.",
      token: issueToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  register,
  login
};
