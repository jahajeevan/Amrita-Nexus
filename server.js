require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const seedEvents = require("./config/seedData");
const { errorHandler } = require("./middlewares/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();
const PORT = Number(process.env.PORT || 5001);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://127.0.0.1:3000",
    credentials: true,
  })
);

app.use(express.json());

const path = require("path");
// Serve static frontend files (HTML, CSS, JS, Assets) directly
app.use(express.static(path.join(__dirname, "./")));


/*
|--------------------------------------------------------------------------
| Serve Frontend Files
|--------------------------------------------------------------------------
*/
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Amrita Nexus backend is running.",
  });
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/register", registrationRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRoutes);

/*
|--------------------------------------------------------------------------
| Error Handler
|--------------------------------------------------------------------------
*/
app.use(errorHandler);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/
const startServer = async () => {
  await connectDB();
  await seedEvents();

  const server = app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the existing process or change PORT in .env.`
      );
      process.exit(1);
    }

    console.error("Server failed to start:", error.message);
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});