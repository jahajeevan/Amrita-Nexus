const App = (() => {
   const API_BASE = `${window.location.protocol}//${window.location.hostname || "127.0.0.1"}:5001/api`;
  const SESSION_KEY = "amrita_nexus_session";
  const THEME_KEY = "amrita_nexus_theme";
  const ADMIN_EMAIL = "jahajeevanv@gmail.com";

  const state = {
    events: [],
    registrations: [],
    activeCategory: "All",
    searchTerm: "",
    signupVerified: false,
    bookmarks: new Set()
  };

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const currentPage = () => document.body.dataset.page || "";

  const getSession = () => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    } catch (error) {
      return null;
    }
  };

  const saveSession = (session) => {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  const bookmarksKey = () => {
    const session = getSession();
    return `amrita_nexus_bookmarks_${session?.email || "guest"}`;
  };

  const loadBookmarks = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(bookmarksKey())) || [];
      state.bookmarks = new Set(parsed);
    } catch (error) {
      state.bookmarks = new Set();
    }
  };

  const saveBookmarks = () => {
    localStorage.setItem(bookmarksKey(), JSON.stringify([...state.bookmarks]));
  };

  const applyTheme = () => {
    document.body.classList.remove("theme-light", "theme-dark");
    localStorage.removeItem(THEME_KEY);
    qsa("[data-theme-toggle]").forEach((node) => node.remove());
  };

  const showToast = (message, type = "success") => {
    const host = qs("#toastHost");
    if (!host) return;
    const toast = document.createElement("div");
    toast.className = `feedback ${type}`;
    toast.style.padding = "14px 16px";
    toast.style.borderRadius = "16px";
    toast.style.background = type === "error" ? "rgba(127,29,29,0.96)" : "rgba(15,23,42,0.96)";
    toast.style.border = "1px solid rgba(255,255,255,0.08)";
    toast.style.boxShadow = "0 18px 40px rgba(0,0,0,0.28)";
    toast.textContent = message;
    host.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  };

  const setFeedback = (node, message, type = "") => {
    if (!node) return;
    node.textContent = message;
    node.className = `feedback ${type}`.trim();
  };

  const setLoading = (button, loading, label) => {
    if (!button) return;
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.innerHTML = `<span class="loader"></span> ${label}`;
      return;
    }
    button.disabled = false;
    button.textContent = button.dataset.originalText || label;
  };

  const api = async (path, options = {}) => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    // Default to Offline Local Storage Demo mode (shows OTP popup on screen).
    // Set 'use_real_backend' to 'true' in localStorage to connect to a real Node backend.
    const USE_REAL_BACKEND = localStorage.getItem("use_real_backend") === "true";

    if (USE_REAL_BACKEND) {
      // Points to current host in production, points to local port 5001 during local development
      const BASE_URL = isLocal 
        ? "http://localhost:5001/api" 
        : window.location.origin + "/api";
      const session = getSession();
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
      };
      if (session?.token) {
        headers.Authorization = `Bearer ${session.token}`;
      }
      const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Request failed.");
      }
      return data;
    }

    // 100% offline Local Storage implementation
    await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate slight network delay

    const method = (options.method || "GET").toUpperCase();
    const body = options.body ? JSON.parse(options.body) : null;

    // Local collections
    const getUsers = () => JSON.parse(localStorage.getItem("nexus_users")) || [];
    const saveUsers = (users) => localStorage.setItem("nexus_users", JSON.stringify(users));

    const getEvents = () => {
      let events = JSON.parse(localStorage.getItem("nexus_events"));
      if (!events || !events.length) {
        events = [
          {
            _id: "evt1",
            title: "Amrita Hackathon 2026",
            date: "2026-06-25",
            time: "09:00",
            endTime: "18:00",
            venue: "Sudhamani Hall",
            category: "Tech",
            description: "An intense 24-hour coding challenge where students solve real-world campus problems.",
            image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80"
          },
          {
            _id: "evt2",
            title: "Goonj Cultural Fest",
            date: "2026-07-10",
            time: "14:00",
            endTime: "22:00",
            venue: "Open Air Theatre",
            category: "Cultural",
            description: "Amrita's annual cultural celebration featuring dance, music, and dramatic performances.",
            image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80"
          },
          {
            _id: "evt3",
            title: "Inter-Campus Sports Meet",
            date: "2026-08-05",
            time: "08:00",
            endTime: "17:00",
            venue: "Main Ground",
            category: "Sports",
            description: "Track and field competitions, football tournaments, and basketball matches across all departments.",
            image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80"
          }
        ];
        localStorage.setItem("nexus_events", JSON.stringify(events));
      }
      return events;
    };
    const saveEvents = (events) => localStorage.setItem("nexus_events", JSON.stringify(events));

    const getRegistrations = () => JSON.parse(localStorage.getItem("nexus_registrations")) || [];
    const saveRegistrations = (regs) => localStorage.setItem("nexus_registrations", JSON.stringify(regs));

    const getMessages = () => JSON.parse(localStorage.getItem("nexus_messages")) || [];
    const saveMessages = (msgs) => localStorage.setItem("nexus_messages", JSON.stringify(msgs));

    const getOtps = () => JSON.parse(localStorage.getItem("nexus_otps")) || {};
    const saveOtps = (otps) => localStorage.setItem("nexus_otps", JSON.stringify(otps));

    const session = getSession();

    // 1. Send OTP
    if (path === "/auth/send-otp" && method === "POST") {
      const email = body.email.trim().toLowerCase();
      if (email === "jahajeevanv@gmail.com") {
        throw new Error("Admin uses the separate email and password login.");
      }
      const users = getUsers();
      const existing = users.find(u => u.email === email);
      if (existing) {
        throw new Error("Account already exists. Please log in with your password.");
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otps = getOtps();
      otps[email] = { otp, expiresAt: Date.now() + 5*60*1000, verified: false };
      saveOtps(otps);

      alert(`[LOCAL STORAGE DEMO]\nOTP verification code: ${otp}\n(Sent to your email: ${email})`);
      return { message: "OTP sent successfully to your email." };
    }

    // 2. Verify OTP
    if (path === "/auth/verify-otp" && method === "POST") {
      const email = body.email.trim().toLowerCase();
      const otp = String(body.otp).trim();
      const otps = getOtps();
      const record = otps[email];
      if (!record) throw new Error("No OTP request found for this email.");
      if (Date.now() > record.expiresAt) throw new Error("OTP has expired. Request a new one.");
      if (record.otp !== otp) throw new Error("Invalid OTP.");

      record.verified = true;
      otps[email] = record;
      saveOtps(otps);
      return { message: "OTP verified successfully." };
    }

    // 3. Register
    if (path === "/auth/register" && method === "POST") {
      const email = body.email.trim().toLowerCase();
      const name = body.name.trim();
      const password = body.password;

      const otps = getOtps();
      const record = otps[email];
      if (!record?.verified) throw new Error("Email verification is required.");

      const users = getUsers();
      if (users.some(u => u.email === email)) throw new Error("Account already exists.");

      const newUser = { id: "usr_" + Date.now(), name, email, password, role: "student" };
      users.push(newUser);
      saveUsers(users);

      delete otps[email];
      saveOtps(otps);

      return {
        message: "Student account created successfully.",
        token: "tok_" + Date.now(),
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
      };
    }

    // 4. Login (Student & Admin)
    if (path === "/auth/login" && method === "POST") {
      const email = body.email.trim().toLowerCase();
      const password = body.password;

      if (email === "jahajeevanv@gmail.com") {
        if (password !== "B/169957737154oh") throw new Error("Invalid admin email or password.");
        return {
          message: "Admin login successful.",
          token: "tok_admin_" + Date.now(),
          user: { id: "admin", name: "Admin", email, role: "admin" }
        };
      }

      const users = getUsers();
      const user = users.find(u => u.email === email);
      if (!user) throw new Error("Student account not found. Please sign up first.");
      if (user.password !== password) throw new Error("Invalid email or password.");

      return {
        message: "Student login successful.",
        token: "tok_" + Date.now(),
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      };
    }

    // 5. Get Events
    if (path === "/events" && method === "GET") {
      return getEvents();
    }

    // 6. Get Event Detail
    if (path.startsWith("/events/") && method === "GET") {
      const eventId = path.split("/")[2];
      const events = getEvents();
      const event = events.find(e => e._id === eventId);
      if (!event) throw new Error("Event not found.");
      return event;
    }

    // 7. Create Event
    if (path === "/events" && method === "POST") {
      const events = getEvents();
      const newEvent = {
        _id: "evt_" + Date.now(),
        title: body.title,
        date: body.date,
        time: body.time,
        endTime: body.endTime,
        venue: body.venue,
        category: body.category,
        description: body.description,
        image: body.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"
      };
      events.push(newEvent);
      saveEvents(events);
      return newEvent;
    }

    // 8. Update Event
    if (path.startsWith("/events/") && method === "PUT") {
      const eventId = path.split("/")[2];
      const events = getEvents();
      const idx = events.findIndex(e => e._id === eventId);
      if (idx === -1) throw new Error("Event not found.");
      events[idx] = { ...events[idx], ...body };
      saveEvents(events);
      return events[idx];
    }

    // 9. Delete Event
    if (path.startsWith("/events/") && method === "DELETE") {
      const eventId = path.split("/")[2];
      let events = getEvents();
      events = events.filter(e => e._id !== eventId);
      saveEvents(events);
      return { message: "Event deleted successfully." };
    }

    // 10. Register Event
    if (path.startsWith("/register/") && method === "POST") {
      const eventId = path.split("/")[2];
      const events = getEvents();
      const event = events.find(e => e._id === eventId);
      if (!event) throw new Error("Event not found.");

      const registrations = getRegistrations();
      const existing = registrations.find(r => r.student?.email === session?.email && r.eventId === eventId);
      if (existing) throw new Error("You are already registered for this event.");

      const users = getUsers();
      const student = users.find(u => u.email === session?.email) || { name: body.name || "Student", email: session?.email };

      const newReg = {
        _id: "reg_" + Date.now(),
        id: "reg_" + Date.now(),
        eventId,
        event,
        student,
        ticketId: "TKT-" + Math.floor(100000 + Math.random() * 900000),
        department: body.department || "Computer Science",
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      registrations.push(newReg);
      saveRegistrations(registrations);
      return { message: "Registered successfully." };
    }

    // 11. Get My Registrations
    if (path === "/register/mine/list" && method === "GET") {
      const registrations = getRegistrations();
      return registrations.filter(r => r.student?.email === session?.email);
    }

    // 12. Get Admin Registrations
    if (path === "/admin/registrations" && method === "GET") {
      const registrations = getRegistrations();
      const events = getEvents();
      const users = getUsers();
      return {
        registrations,
        summary: {
          events: events.length,
          users: users.length,
          registrations: registrations.length
        }
      };
    }

    // 13. Get Admin Messages
    if (path === "/admin/messages" && method === "GET") {
      return getMessages();
    }

    // 14. Reply to Message
    if (path.startsWith("/admin/messages/") && path.endsWith("/reply") && method === "POST") {
      const msgId = path.split("/")[3];
      const messages = getMessages();
      const idx = messages.findIndex(m => m.id === msgId || m._id === msgId);
      if (idx === -1) throw new Error("Message not found.");
      messages[idx].reply = body.reply;
      messages[idx].repliedAt = new Date().toISOString();
      saveMessages(messages);
      return { message: "Reply sent." };
    }

    // 15. Get My Messages
    if (path === "/contact/mine" && method === "GET") {
      const messages = getMessages();
      return messages.filter(m => m.email === session?.email);
    }

    // 16. Submit Message
    if (path === "/contact" && method === "POST") {
      const messages = getMessages();
      const newMsg = {
        _id: "msg_" + Date.now(),
        id: "msg_" + Date.now(),
        name: body.name,
        email: session?.email || body.email,
        message: body.message,
        createdAt: new Date().toISOString()
      };
      messages.push(newMsg);
      saveMessages(messages);
      return { message: "Message sent successfully." };
    }

    throw new Error(`Endpoint not found: ${path}`);
  };

  const observeReveal = () => {
    const nodes = qsa(".reveal");
    if (!nodes.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    nodes.forEach((node) => observer.observe(node));
  };

  const formatDate = (dateValue, timeValue = "") => {
    if (!dateValue) return timeValue;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return [dateValue, timeValue].filter(Boolean).join(" • ");
    }
    return `${parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}${timeValue ? ` • ${timeValue}` : ""}`;
  };

  const escapeHtml = (value = "") => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected image file."));
    reader.readAsDataURL(file);
  });

  const buildCalendarLink = (event) => {
    const title = encodeURIComponent(event.title || "Amrita Nexus Event");
    const details = encodeURIComponent(event.description || "College event registration via Amrita Nexus");
    const location = encodeURIComponent(event.venue || "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
  };

  const ticketQrPayload = (registration) => [
    "Amrita Nexus Ticket",
    `Ticket ID: ${registration.ticketId}`,
    `Event: ${registration.event?.title || ""}`,
    `Student: ${registration.student?.name || ""}`,
    `Email: ${registration.student?.email || ""}`,
    `Department: ${registration.department || ""}`,
    `Date: ${registration.event?.date || ""}`,
    `Time: ${registration.event?.time || ""}`,
    `Venue: ${registration.event?.venue || ""}`
  ].join("\n");

  const renderQrBlocks = (scope = document) => {
    qsa(".ticket-qr", scope).forEach((node) => {
      const payload = node.dataset.ticket;
      if (!payload) return;
      node.innerHTML = "";
      if (window.QRCode) {
        new window.QRCode(node, {
          text: payload,
          width: 92,
          height: 92,
          colorDark: "#0f172a",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.M
        });
      } else {
        node.textContent = "QR unavailable";
      }
    });
  };

  const requireAuth = (role = "") => {
    const session = getSession();
    if (!session?.token) {
      window.location.href = "login.html";
      return null;
    }
    if (role && session.role !== role) {
      window.location.href = session.role === "admin" ? "admin.html" : "events.html";
      return null;
    }
    return session;
  };

  const updateHeaderAuth = () => {
    const session = getSession();
    qsa("[data-auth='logout']").forEach((node) => {
      node.classList.toggle("hidden", !session);
      if (session) node.textContent = `Logout (${session.email})`;
      node.onclick = () => {
        saveSession(null);
        window.location.href = "login.html";
      };
    });
  };

  const activateAuthTab = (tab) => {
    qsa("[data-tab-target]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tabTarget === tab);
    });
    qsa("[data-auth-pane]").forEach((pane) => {
      pane.classList.toggle("active", pane.dataset.authPane === tab);
    });
  };

  const bindThemeToggle = () => {};

  const downloadTicket = async (registration) => {
    const payload = ticketQrPayload(registration);
    let qrDataUrl = "";

    if (window.QRCode) {
      const qrMount = document.createElement("div");
      qrMount.style.position = "fixed";
      qrMount.style.left = "-9999px";
      qrMount.style.top = "-9999px";
      document.body.appendChild(qrMount);
      new window.QRCode(qrMount, {
        text: payload,
        width: 180,
        height: 180,
        colorDark: "#111827",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M
      });
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      const canvas = qs("canvas", qrMount);
      const image = qs("img", qrMount);
      if (canvas) {
        qrDataUrl = canvas.toDataURL("image/png");
      } else if (image) {
        qrDataUrl = image.src;
      }
      qrMount.remove();
    }

    const ticketMarkup = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(registration.ticketId)} | Amrita Nexus Ticket</title>
  <style>
    body {
      margin: 0;
      padding: 32px;
      background: #f3f4f6;
      color: #111827;
      font-family: Inter, Arial, sans-serif;
    }
    .ticket {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 28px;
      padding: 32px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
    }
    .ticket-head {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-start;
      margin-bottom: 28px;
    }
    .badge {
      display: inline-flex;
      padding: 8px 14px;
      border-radius: 999px;
      background: #f3f4f6;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #475569;
    }
    h1 {
      margin: 14px 0 8px;
      font-size: 38px;
      line-height: 1;
    }
    .sub {
      margin: 0;
      color: #64748b;
      font-size: 16px;
    }
    .ticket-grid {
      display: grid;
      grid-template-columns: 1.4fr 220px;
      gap: 28px;
      align-items: start;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
      margin-top: 24px;
    }
    .meta-card {
      padding: 18px;
      border-radius: 18px;
      background: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.08);
    }
    .meta-card span {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #64748b;
    }
    .meta-card strong {
      font-size: 18px;
      line-height: 1.4;
    }
    .qr-box {
      padding: 18px;
      border-radius: 22px;
      background: #ffffff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      text-align: center;
    }
    .qr-box img {
      width: 180px;
      height: 180px;
    }
    .ticket-note {
      margin-top: 26px;
      padding-top: 18px;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      color: #64748b;
      line-height: 1.7;
    }
  </style>
</head>
<body>
  <article class="ticket">
    <div class="ticket-head">
      <div>
        <span class="badge">Amrita Nexus Ticket</span>
        <h1>${escapeHtml(registration.event?.title || "")}</h1>
        <p class="sub">${escapeHtml(formatDate(registration.event?.date, registration.event?.time))} • ${escapeHtml(registration.event?.venue || "")}</p>
      </div>
      <div class="badge">${escapeHtml(registration.ticketId)}</div>
    </div>
    <div class="ticket-grid">
      <div>
        <div class="meta">
          <div class="meta-card">
            <span>Student Name</span>
            <strong>${escapeHtml(registration.student?.name || "-")}</strong>
          </div>
          <div class="meta-card">
            <span>Email</span>
            <strong>${escapeHtml(registration.student?.email || "-")}</strong>
          </div>
          <div class="meta-card">
            <span>Department</span>
            <strong>${escapeHtml(registration.department || "-")}</strong>
          </div>
          <div class="meta-card">
            <span>Event End</span>
            <strong>${escapeHtml(registration.event?.endTime || "-")}</strong>
          </div>
        </div>
      </div>
      <div class="qr-box">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="Ticket QR code">` : `<p>${escapeHtml(payload).replace(/\n/g, "<br>")}</p>`}
      </div>
    </div>
    <p class="ticket-note">Show this ticket at the venue entrance. The QR contains readable ticket details for scanning, including ticket ID, event, student, department, date, time, and venue.</p>
  </article>
</body>
</html>`;

    const blob = new Blob([ticketMarkup], { type: "text/html;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${registration.ticketId}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  };

  const bindLoginPage = () => {
    if (currentPage() !== "login") return;
    const session = getSession();
    if (session?.role === "student") {
      window.location.href = "dashboard.html";
      return;
    }
    if (session?.role === "admin") {
      window.location.href = "admin.html";
      return;
    }

    const mode = new URLSearchParams(window.location.search).get("mode") || "student-login";
    activateAuthTab(mode);

    qsa("[data-tab-target]").forEach((button) => {
      button.addEventListener("click", () => activateAuthTab(button.dataset.tabTarget));
    });

    const loginForm = qs("#studentLoginForm");
    const loginFeedback = qs("#studentLoginFeedback");
    loginForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = qs("button[type='submit']", loginForm);
      const email = loginForm.email.value.trim().toLowerCase();
      const password = loginForm.password.value;

      if (email === ADMIN_EMAIL) {
        activateAuthTab("admin");
        setFeedback(loginFeedback, "That email is reserved for admin access. Use the Admin tab.", "error");
        return;
      }

      setLoading(button, true, "Signing In");
      try {
        const response = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
        saveSession({
          token: response.token,
          email: response.user.email,
          role: response.user.role,
          name: response.user.name,
          userId: response.user.id
        });
        setFeedback(loginFeedback, "Login successful. Redirecting...", "success");
        setTimeout(() => { window.location.href = "dashboard.html"; }, 500);
      } catch (error) {
        setFeedback(loginFeedback, error.message, "error");
      } finally {
        setLoading(button, false, "Login");
      }
    });

    const signupForm = qs("#studentSignupForm");
    const signupFeedback = qs("#studentSignupFeedback");
    const otpStep = qs("#signupOtpStep");
    const passwordStep = qs("#signupPasswordStep");
    const sendButton = qs("[data-signup-send]");
    const verifyButton = qs("[data-signup-verify]");
    const registerButton = qs("[data-signup-register]");

    sendButton?.addEventListener("click", async () => {
      const name = signupForm.signupName.value.trim();
      const email = signupForm.signupEmail.value.trim().toLowerCase();
      if (!name || !email) {
        setFeedback(signupFeedback, "Enter your full name and Gmail address first.", "error");
        return;
      }
      setLoading(sendButton, true, "Sending OTP");
      try {
        await api("/auth/send-otp", {
          method: "POST",
          body: JSON.stringify({ email })
        });
        otpStep.classList.remove("hidden");
        setFeedback(signupFeedback, "OTP sent successfully. Check your Gmail inbox.", "success");
      } catch (error) {
        setFeedback(signupFeedback, error.message, "error");
      } finally {
        setLoading(sendButton, false, "Send OTP");
      }
    });

    verifyButton?.addEventListener("click", async () => {
      const email = signupForm.signupEmail.value.trim().toLowerCase();
      const otp = signupForm.signupOtp.value.trim();
      if (!email || !otp) {
        setFeedback(signupFeedback, "Enter the OTP sent to your Gmail.", "error");
        return;
      }
      setLoading(verifyButton, true, "Verifying");
      try {
        await api("/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ email, otp })
        });
        state.signupVerified = true;
        passwordStep.classList.remove("hidden");
        setFeedback(signupFeedback, "OTP verified. Create your password now.", "success");
      } catch (error) {
        setFeedback(signupFeedback, error.message, "error");
      } finally {
        setLoading(verifyButton, false, "Verify OTP");
      }
    });

    registerButton?.addEventListener("click", async () => {
      const name = signupForm.signupName.value.trim();
      const email = signupForm.signupEmail.value.trim().toLowerCase();
      const password = signupForm.signupPassword.value;
      if (!state.signupVerified) {
        setFeedback(signupFeedback, "Verify your OTP before creating the password.", "error");
        return;
      }
      setLoading(registerButton, true, "Creating Account");
      try {
        const response = await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password })
        });
        saveSession({
          token: response.token,
          email: response.user.email,
          role: response.user.role,
          name: response.user.name,
          userId: response.user.id
        });
        setFeedback(signupFeedback, "Account created successfully. Redirecting...", "success");
        setTimeout(() => { window.location.href = "dashboard.html"; }, 600);
      } catch (error) {
        setFeedback(signupFeedback, error.message, "error");
      } finally {
        setLoading(registerButton, false, "Create Password & Continue");
      }
    });

    const adminForm = qs("#adminLoginForm");
    const adminFeedback = qs("#adminLoginFeedback");
    adminForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = qs("button[type='submit']", adminForm);
      const email = adminForm.adminEmail.value.trim().toLowerCase();
      const password = adminForm.adminPassword.value;

      setLoading(button, true, "Signing In");
      try {
        const response = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        });
        saveSession({
          token: response.token,
          email: response.user.email,
          role: response.user.role,
          name: response.user.name,
          userId: response.user.id
        });
        setFeedback(adminFeedback, "Admin login successful. Redirecting...", "success");
        setTimeout(() => { window.location.href = "admin.html"; }, 500);
      } catch (error) {
        setFeedback(adminFeedback, error.message, "error");
      } finally {
        setLoading(button, false, "Proceed as Admin");
      }
    });
  };

  const filteredEvents = () => state.events.filter((event) => {
    const categoryMatch = state.activeCategory === "All" || event.category === state.activeCategory;
    const searchMatch = !state.searchTerm || event.title.toLowerCase().includes(state.searchTerm.toLowerCase());
    return categoryMatch && searchMatch;
  });

  const toggleBookmark = (eventId) => {
    if (state.bookmarks.has(eventId)) {
      state.bookmarks.delete(eventId);
      showToast("Removed from favorites.");
    } else {
      state.bookmarks.add(eventId);
      showToast("Added to favorites.");
    }
    saveBookmarks();
    renderEventsGrid();
  };

  const renderRegistrationList = () => {
    const wrap = qs("#myRegistrations");
    if (!wrap) return;
    if (!state.registrations.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <h3>No registrations yet</h3>
          <p>Your confirmed event registrations will appear here.</p>
        </div>
      `;
      return;
    }

    wrap.innerHTML = state.registrations.map((registration) => `
      <div class="ticket-card">
        <div class="ticket-copy">
          <h4>${escapeHtml(registration.event?.title || "Event unavailable")}</h4>
          <p>${escapeHtml(formatDate(registration.event?.date, registration.event?.time))}</p>
          <p>${escapeHtml(registration.event?.venue || "")}</p>
          <p>Ticket ID: ${escapeHtml(registration.ticketId)}</p>
          <p>Department: ${escapeHtml(registration.department || "-")}</p>
        </div>
        <div class="ticket-qr" data-ticket='${escapeHtml(ticketQrPayload(registration))}'></div>
        <div class="card-actions ticket-actions">
          <a class="ghost-btn" href="event.html?id=${registration.event?.id}">View</a>
          <a class="outline-btn" href="${buildCalendarLink(registration.event || {})}" target="_blank" rel="noreferrer">Calendar</a>
          <button class="outline-btn" type="button" data-download-ticket="${registration.id}">Download Ticket</button>
        </div>
      </div>
    `).join("");

    renderQrBlocks(wrap);
    qsa("[data-download-ticket]", wrap).forEach((button) => {
      button.addEventListener("click", () => {
        const registration = state.registrations.find((item) => item.id === button.dataset.downloadTicket);
        if (registration) downloadTicket(registration);
      });
    });
  };

  const renderEventsGrid = () => {
    const grid = qs("#eventsGrid");
    if (!grid) return;
    const items = filteredEvents();
    if (!items.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No matching events</h3>
          <p>Try a different keyword or category.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map((event) => `
      <article class="event-card reveal">
        <img class="event-card-image" src="${escapeHtml(event.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80")}" alt="${escapeHtml(event.title)}">
        <div class="event-card-top">
          <div class="pill">${escapeHtml(event.category)}</div>
          <button class="bookmark-btn ${state.bookmarks.has(event.id) ? "active" : ""}" type="button" data-bookmark-event="${event.id}" aria-label="Toggle bookmark">★</button>
        </div>
        <h3>${escapeHtml(event.title)}</h3>
        <div class="event-meta">
          <span>${escapeHtml(formatDate(event.date, event.time))}</span>
          <span>${escapeHtml(event.venue)}</span>
        </div>
        <p>${escapeHtml(event.description)}</p>
        <div class="card-actions">
          <a class="btn" href="event.html?id=${event.id}">View Details</a>
          <a class="outline-btn" href="${event.mapsUrl}" target="_blank" rel="noreferrer">Venue Map</a>
        </div>
      </article>
    `).join("");

    qsa("[data-bookmark-event]", grid).forEach((button) => {
      button.addEventListener("click", () => toggleBookmark(button.dataset.bookmarkEvent));
    });

    observeReveal();
  };

  const loadEventsPage = async () => {
    if (currentPage() !== "events") return;
    const session = requireAuth("student");
    if (!session) return;

    const greeting = qs("#studentGreeting");
    if (greeting) greeting.textContent = session.name || session.email;

    try {
      const [events, registrations] = await Promise.all([
        api("/events"),
        api("/register/mine/list")
      ]);
      state.events = events;
      state.registrations = registrations;
      qs("#eventCount").textContent = String(events.length);
      qs("#registrationCount").textContent = String(registrations.length);
      const bookmarkNode = qs("#bookmarkCount");
      if (bookmarkNode) bookmarkNode.textContent = String(state.bookmarks.size);
      renderEventsGrid();
      renderRegistrationList();
    } catch (error) {
      const grid = qs("#eventsGrid");
      if (grid) {
        grid.innerHTML = `<div class="empty-state"><h3>Unable to load events</h3><p>${escapeHtml(error.message)}</p></div>`;
      }
    }

    qsa("[data-category]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeCategory = button.dataset.category;
        qsa("[data-category]").forEach((node) => node.classList.toggle("active", node === button));
        renderEventsGrid();
      });
    });

    qs("#eventSearch")?.addEventListener("input", (event) => {
      state.searchTerm = event.target.value.trim();
      renderEventsGrid();
    });
  };

  const renderDetailTicket = (registration) => {
    if (!registration) {
      return `
        <div class="empty-state">
          <h3>No ticket yet</h3>
          <p>Register for this event to generate your QR ticket and add it to your calendar.</p>
        </div>
      `;
    }

    return `
      <div class="ticket-card detail-ticket">
        <div class="ticket-copy">
          <h4>${escapeHtml(registration.event?.title || "")}</h4>
          <p>${escapeHtml(formatDate(registration.event?.date, registration.event?.time))}</p>
          <p>${escapeHtml(registration.event?.venue || "")}</p>
          <p>Ticket ID: ${escapeHtml(registration.ticketId)}</p>
          <p>Name: ${escapeHtml(registration.student?.name || "-")}</p>
          <p>Department: ${escapeHtml(registration.department || "-")}</p>
        </div>
        <div class="ticket-qr" data-ticket='${escapeHtml(ticketQrPayload(registration))}'></div>
        <div class="card-actions">
          <a class="outline-btn" href="${buildCalendarLink(registration.event || {})}" target="_blank" rel="noreferrer">Add to Calendar</a>
          <button class="outline-btn" type="button" data-download-detail-ticket="${escapeHtml(registration.id)}">Download Ticket</button>
        </div>
      </div>
    `;
  };

  const loadEventDetailPage = async () => {
    if (currentPage() !== "event-detail") return;
    const session = requireAuth("student");
    if (!session) return;

    const root = qs("#eventDetailRoot");
    const eventId = new URLSearchParams(window.location.search).get("id");
    if (!eventId) {
      root.innerHTML = `<div class="empty-state"><h3>Event not found</h3><p>The event link is incomplete.</p></div>`;
      return;
    }

    const refresh = async () => {
      const [event, registrations] = await Promise.all([
        api(`/events/${eventId}`),
        api("/register/mine/list")
      ]);
      state.registrations = registrations;
      const existingRegistration = registrations.find((item) => item.event?.id === eventId);

      root.innerHTML = `
        <div class="event-detail-layout">
          <div class="event-detail-visual">
            <img src="${escapeHtml(event.image || "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80")}" alt="${escapeHtml(event.title)}">
          </div>
          <div class="event-detail-copy">
            <span class="pill">${escapeHtml(event.category)}</span>
            <h1>${escapeHtml(event.title)}</h1>
            <div class="event-meta detail-meta">
              <span>${escapeHtml(formatDate(event.date, event.time))}</span>
              <span>${escapeHtml(event.venue)}</span>
            </div>
            <p>${escapeHtml(event.description)}</p>
            <div class="card-actions detail-actions">
              <button class="btn" id="detailRegisterBtn" ${existingRegistration ? "disabled" : ""}>${existingRegistration ? "Already Registered" : "Register Now"}</button>
              <a class="ghost-btn" href="${event.mapsUrl}" target="_blank" rel="noreferrer">Open Google Maps</a>
              <a class="outline-btn" href="${buildCalendarLink(event)}" target="_blank" rel="noreferrer">Add to Calendar</a>
            </div>
            <form class="registration-form hidden" id="detailRegistrationForm">
              <label class="label">
                <span>Student name</span>
                <input class="input" type="text" name="name" value="${escapeHtml(session.name || "")}" required>
              </label>
              <label class="label">
                <span>Student email</span>
                <input class="input" type="email" name="email" value="${escapeHtml(session.email || "")}" readonly>
              </label>
              <label class="label">
                <span>Department</span>
                <input class="input" type="text" name="department" required>
              </label>
              <div class="form-actions">
                <button class="btn" type="submit" id="confirmRegisterBtn">Confirm Registration</button>
              </div>
            </form>
            <div class="detail-ticket-wrap">
              <span class="eyebrow">Ticket</span>
              ${renderDetailTicket(existingRegistration)}
            </div>
          </div>
        </div>
      `;

      renderQrBlocks(root);
      qs("[data-download-detail-ticket]")?.addEventListener("click", async () => {
        if (existingRegistration) downloadTicket(existingRegistration);
      });

      qs("#detailRegisterBtn")?.addEventListener("click", async (clickEvent) => {
        clickEvent.currentTarget.classList.add("hidden");
        qs("#detailRegistrationForm")?.classList.remove("hidden");
      });

      qs("#detailRegistrationForm")?.addEventListener("submit", async (submitEvent) => {
        submitEvent.preventDefault();
        const button = qs("#confirmRegisterBtn");
        const form = submitEvent.currentTarget;
        const payload = {
          name: form.name.value.trim(),
          department: form.department.value.trim()
        };

        setLoading(button, true, "Registering");
        try {
          await api(`/register/${eventId}`, {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("Registration completed successfully.");
          await refresh();
        } catch (error) {
          showToast(error.message, "error");
        } finally {
          setLoading(button, false, "Confirm Registration");
        }
      });
    };

    try {
      await refresh();
    } catch (error) {
      root.innerHTML = `<div class="empty-state"><h3>Unable to load event</h3><p>${escapeHtml(error.message)}</p></div>`;
    }
  };

  const fillEventForm = (form, event = null) => {
    form.reset();
    form.dataset.editing = event?.id || "";
    form.dataset.currentImage = event?.image || "";
    qs("#eventFormTitle").textContent = event ? "Edit event" : "Create event";
    qs("#saveEventBtn").textContent = event ? "Save Changes" : "Publish Event";
    if (!event) {
      form.category.selectedIndex = 0;
      return;
    }
    form.title.value = event.title || "";
    form.description.value = event.description || "";
    form.date.value = event.date || "";
    form.time.value = event.time || "";
    form.endTime.value = event.endTime || "";
    form.venue.value = event.venue || "";
    form.category.value = event.category || "";
  };

  const renderAdminEvents = (events) => {
    const body = qs("#eventsBody");
    if (!body) return;
    if (!events.length) {
      body.innerHTML = `<tr><td colspan="4">No events created yet.</td></tr>`;
      return;
    }
    body.innerHTML = events.map((event) => `
      <tr>
        <td><strong>${escapeHtml(event.title)}</strong><br><span>${escapeHtml(event.category)}</span></td>
        <td>${escapeHtml(formatDate(event.date, event.time))}</td>
        <td>${escapeHtml(event.venue)}</td>
        <td>
          <div class="card-actions event-actions">
            <button class="ghost-btn" data-edit-event="${event.id}">Edit</button>
            <button class="danger-btn" data-delete-event="${event.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  };

  const renderAdminRegistrations = (registrations) => {
    const body = qs("#registrationsBody");
    if (!body) return;
    if (!registrations.length) {
      body.innerHTML = `<tr><td colspan="7">No student registrations yet.</td></tr>`;
      return;
    }
    body.innerHTML = registrations.map((row) => `
      <tr>
        <td>${escapeHtml(row.event?.title || "Deleted Event")}</td>
        <td>${escapeHtml(row.ticketId || "-")}</td>
        <td>${escapeHtml(row.student?.name || row.student?.email || "-")}<br><span>${escapeHtml(row.student?.email || "-")}</span></td>
        <td>${escapeHtml(row.department || "-")}</td>
        <td>${escapeHtml(row.event?.venue || "-")}</td>
        <td>${escapeHtml(row.event?.endTime || row.event?.time || "-")}</td>
        <td>${escapeHtml(new Date(row.timestamp).toLocaleString("en-IN"))}</td>
      </tr>
    `).join("");
  };

  const renderAdminMessages = (messages) => {
    const wrap = qs("#adminMessagesList");
    if (!wrap) return;
    if (!messages.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <h3>No messages yet</h3>
          <p>Student contact requests will appear here.</p>
        </div>
      `;
      return;
    }

    wrap.innerHTML = messages.map((item) => `
      <article class="message-card">
        <div class="message-card-head">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(item.email)}</p>
          </div>
          <span>${escapeHtml(new Date(item.createdAt).toLocaleString("en-IN"))}</span>
        </div>
        <p class="message-copy">${escapeHtml(item.message)}</p>
        <form class="message-reply-form" data-reply-form="${item.id}">
          <label class="label">
            <span>Admin reply</span>
            <textarea class="textarea" name="reply">${escapeHtml(item.reply || "")}</textarea>
          </label>
          <div class="form-actions">
            <button class="btn" type="submit">Save Reply</button>
          </div>
        </form>
      </article>
    `).join("");
  };

  const loadAdminPage = async () => {
    if (currentPage() !== "admin") return;
    const session = requireAuth("admin");
    if (!session) return;

    qs("#adminEmailBadge").textContent = session.email;
    const form = qs("#eventForm");

    const refreshAdmin = async () => {
      const [events, adminData, messages] = await Promise.all([
        api("/events"),
        api("/admin/registrations"),
        api("/admin/messages")
      ]);
      state.events = events;
      state.registrations = adminData.registrations;
      qs("#adminEventCount").textContent = String(adminData.summary.events);
      qs("#adminUserCount").textContent = String(adminData.summary.users);
      qs("#adminRegistrationCount").textContent = String(adminData.summary.registrations);
      renderAdminEvents(events);
      renderAdminRegistrations(adminData.registrations);
      renderAdminMessages(messages);
    };

    try {
      await refreshAdmin();
      fillEventForm(form);
    } catch (error) {
      qs("#eventsBody").innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
    }

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = qs("#saveEventBtn");
      const selectedFile = form.imageFile.files?.[0] || null;
      const image = selectedFile ? await fileToDataUrl(selectedFile) : (form.dataset.currentImage || "");
      const payload = {
        title: form.title.value.trim(),
        description: form.description.value.trim(),
        date: form.date.value,
        time: form.time.value,
        endTime: form.endTime.value,
        venue: form.venue.value.trim(),
        category: form.category.value,
        image
      };
      const editingId = form.dataset.editing;

      setLoading(button, true, editingId ? "Saving" : "Publishing");
      try {
        if (editingId) {
          await api(`/events/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          showToast("Event updated successfully.");
        } else {
          await api("/events", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("Event created successfully.");
        }
        await refreshAdmin();
        fillEventForm(form);
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setLoading(button, false, editingId ? "Save Changes" : "Publish Event");
      }
    });

    qs("#resetEventBtn")?.addEventListener("click", () => fillEventForm(form));

    document.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-edit-event]");
      const deleteButton = event.target.closest("[data-delete-event]");

      if (editButton) {
        const selected = state.events.find((item) => item.id === editButton.dataset.editEvent);
        if (selected) fillEventForm(form, selected);
      }

      if (deleteButton) {
        const confirmed = window.confirm("Delete this event?");
        if (!confirmed) return;
        try {
          await api(`/events/${deleteButton.dataset.deleteEvent}`, { method: "DELETE" });
          showToast("Event deleted successfully.");
          await refreshAdmin();
          fillEventForm(form);
        } catch (error) {
          showToast(error.message, "error");
        }
      }
    });

    document.addEventListener("submit", async (event) => {
      const replyForm = event.target.closest("[data-reply-form]");
      if (!replyForm) return;
      event.preventDefault();
      const button = qs("button[type='submit']", replyForm);
      setLoading(button, true, "Saving");
      try {
        await api(`/admin/messages/${replyForm.dataset.replyForm}/reply`, {
          method: "PUT",
          body: JSON.stringify({ reply: replyForm.reply.value.trim() })
        });
        showToast("Reply saved successfully.");
        await refreshAdmin();
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setLoading(button, false, "Save Reply");
      }
    });
  };

  const renderDashboardLists = () => {
    const registrationsWrap = qs("#dashboardRegistrationsList");
    const ticketsWrap = qs("#dashboardTicketsList");
    if (!registrationsWrap || !ticketsWrap) return;

    if (!state.registrations.length) {
      registrationsWrap.innerHTML = `
        <div class="empty-state">
          <h3>No registrations yet</h3>
          <p>Your confirmed events will appear here.</p>
        </div>
      `;
      ticketsWrap.innerHTML = `
        <div class="empty-state">
          <h3>No tickets yet</h3>
          <p>After registration, your downloadable tickets will appear here.</p>
        </div>
      `;
      return;
    }

    registrationsWrap.innerHTML = state.registrations.map((registration) => `
      <div class="compact-ticket">
        <div>
          <strong>${escapeHtml(registration.event?.title || "")}</strong>
          <p>${escapeHtml(formatDate(registration.event?.date, registration.event?.time))}</p>
        </div>
        <span>${escapeHtml(registration.ticketId)}</span>
      </div>
    `).join("");

    ticketsWrap.innerHTML = state.registrations.map((registration) => `
      <div class="ticket-card mini-ticket">
        <div class="ticket-copy">
          <h4>${escapeHtml(registration.event?.title || "")}</h4>
          <p>${escapeHtml(registration.ticketId)}</p>
          <p>${escapeHtml(registration.department || "-")}</p>
        </div>
        <div class="card-actions">
          <button class="outline-btn" type="button" data-dashboard-download="${registration.id}">Download Ticket</button>
          <a class="ghost-btn" href="event.html?id=${registration.event?.id}">View</a>
        </div>
      </div>
    `).join("");

    qsa("[data-dashboard-download]", ticketsWrap).forEach((button) => {
      button.addEventListener("click", async () => {
        const registration = state.registrations.find((item) => item.id === button.dataset.dashboardDownload);
        if (registration) downloadTicket(registration);
      });
    });
  };

  const loadDashboardPage = async () => {
    if (currentPage() !== "dashboard") return;
    const session = requireAuth("student");
    if (!session) return;
    const greeting = qs("#dashboardGreeting");
    if (greeting) greeting.textContent = `${session.name || "Student"}, your home`;
    try {
      const registrations = await api("/register/mine/list");
      state.registrations = registrations;
      qs("#dashboardRegisteredCount").textContent = String(registrations.length);
      qs("#dashboardBookmarkCount").textContent = String(state.bookmarks.size);
      qs("#dashboardTicketCount").textContent = String(registrations.length);
      renderDashboardLists();
    } catch (error) {
      qs("#dashboardRegistrationsList").innerHTML = `<div class="empty-state"><h3>Unable to load dashboard</h3><p>${escapeHtml(error.message)}</p></div>`;
    }
  };

  const renderContactReplies = (messages) => {
    const wrap = qs("#contactRepliesList");
    if (!wrap) return;
    if (!messages.length) {
      wrap.innerHTML = `
        <div class="empty-state">
          <h3>No messages yet</h3>
          <p>Once you contact the admin team, replies will appear here.</p>
        </div>
      `;
      return;
    }

    wrap.innerHTML = messages.map((item) => `
      <div class="reply-card">
        <div class="reply-card-head">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(new Date(item.createdAt).toLocaleString("en-IN"))}</span>
        </div>
        <p class="message-copy">${escapeHtml(item.message)}</p>
        <div class="reply-block ${item.reply ? "" : "reply-pending"}">
          <span class="eyebrow">${item.reply ? "Admin replied" : "Awaiting reply"}</span>
          <p>${escapeHtml(item.reply || "The admin team has not replied yet.")}</p>
        </div>
      </div>
    `).join("");
  };

  const loadContactPage = async () => {
    if (currentPage() !== "contact") return;
    const session = requireAuth("student");
    if (!session) return;
    const form = qs("#contactForm");
    const feedback = qs("#contactFeedback");
    if (form) {
      form.name.value = session.name || "";
      form.email.value = session.email || "";
    }

    const refreshMessages = async () => {
      const messages = await api("/contact/mine");
      renderContactReplies(messages);
    };

    try {
      await refreshMessages();
    } catch (error) {
      renderContactReplies([]);
      setFeedback(feedback, error.message, "error");
    }

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = qs("#contactSubmitBtn");
      setLoading(button, true, "Sending");
      try {
        await api("/contact", {
          method: "POST",
          body: JSON.stringify({
            name: form.name.value.trim(),
            message: form.message.value.trim()
          })
        });
        form.message.value = "";
        setFeedback(feedback, "Your message has been submitted successfully.", "success");
        showToast("Message sent to admin.");
        await refreshMessages();
      } catch (error) {
        setFeedback(feedback, error.message, "error");
      } finally {
        setLoading(button, false, "Submit");
      }
    });
  };

  const init = () => {
    loadBookmarks();
    applyTheme();
    bindThemeToggle();
    updateHeaderAuth();
    observeReveal();
    bindLoginPage();
    loadEventsPage();
    loadEventDetailPage();
    loadDashboardPage();
    loadContactPage();
    loadAdminPage();
  };

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
