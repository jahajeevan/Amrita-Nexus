const nodemailer = require("nodemailer");

const createMailer = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials are missing. Configure SMTP_USER and SMTP_PASS in .env.");
  }

  const sanitizedPassword = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const host = String(process.env.SMTP_HOST || "smtp.gmail.com").trim().toLowerCase();
  const isGmail = host.includes("gmail");

  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: sanitizedPassword
      }
    });
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: sanitizedPassword
    }
  });
};

module.exports = createMailer();
