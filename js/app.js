const App = (() => {
  const state = {
    featuredIndex: 0,
    barChart: null,
    pieChart: null,
    events: [],
    registrations: []
  };

  const getCurrentUser = () => AppData.getSession();
  const getSessionKey = (session) => session?.email || "";
  const isAdmin = () => getCurrentUser()?.role === "admin";
  const isLoggedIn = () => Boolean(getCurrentUser()?.token);

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });

  const buildEmbedMapUrl = (value) => `https://www.google.com/maps?q=${encodeURIComponent(value)}&z=17&output=embed`;
  const normalizeMapUrl = (rawUrl, venue) => {
    const input = (rawUrl || "").trim();
    const fallback = buildEmbedMapUrl(venue || "Amrita University Ettimadai Coimbatore");
    if (!input) return fallback;
    if (input.includes("google.com/maps/embed")) return input;

    try {
      const parsed = new URL(input);
      const host = parsed.hostname.toLowerCase();
      const query = parsed.searchParams.get("q")
        || parsed.searchParams.get("query")
        || parsed.searchParams.get("destination")
        || parsed.searchParams.get("near");
      if (query) return buildEmbedMapUrl(query);
      if (host.includes("maps.app.goo.gl")) return fallback;
    } catch (error) {
      return buildEmbedMapUrl(input);
    }

    return fallback;
  };

  const requiresStudentLogin = () => document.body.dataset.page !== "admin";

  const updateAuthButton = () => {
    const authTrigger = document.getElementById("authTrigger");
    const session = getCurrentUser();
    if (!authTrigger) return;
    authTrigger.textContent = session ? `Logout (${session.email})` : "Login";
  };

  const toggleNav = () => {
    document.getElementById("navLinks")?.classList.toggle("open");
  };

  const showAuthModal = () => {
    document.getElementById("studentAuthGate")?.remove();
    document.getElementById("authModal")?.classList.remove("hidden");
    bindAuthModal();
  };

  const closeAuthModal = () => {
    document.getElementById("authModal")?.classList.add("hidden");
    renderStudentGate();
  };

  const renderStudentGate = () => {
    const existing = document.getElementById("studentAuthGate");
    if (!requiresStudentLogin() || isLoggedIn()) {
      existing?.remove();
      document.body.classList.remove("auth-locked");
      return;
    }

    document.body.classList.add("auth-locked");
    if (existing) return;

    const gate = document.createElement("div");
    gate.id = "studentAuthGate";
    gate.className = "auth-gate";
    gate.innerHTML = `
      <div class="auth-gate-card">
        <h1>Student login required</h1>
        <p>Enter with your email OTP before accessing Amrita Nexus. This localhost version uses backend auth instead of browser-only storage.</p>
        <div class="auth-gate-actions">
          <button class="primary-btn" id="gateLoginBtn">Login with OTP</button>
        </div>
      </div>
    `;
    document.body.appendChild(gate);
    document.getElementById("gateLoginBtn")?.addEventListener("click", showAuthModal);
  };

  const bindAuthModal = () => {
    const modal = document.getElementById("authModal");
    const closeButton = document.getElementById("closeAuthModal");
    const form = document.getElementById("authForm");
    const sendOtpButton = document.getElementById("sendOtpBtn");
    const emailInput = document.getElementById("authUsername");
    const otpInput = document.getElementById("authOtp");
    const otpHint = document.getElementById("otpHint");

    closeButton?.addEventListener("click", closeAuthModal);
    modal?.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeAuthModal();
      }
    });

    sendOtpButton?.addEventListener("click", async () => {
      const email = emailInput.value.trim().toLowerCase();
      if (!email) {
        UI.showToast("Enter your email first.");
        return;
      }

      try {
        const response = await Api.sendOtp(email);
        UI.showToast(response.message || "OTP sent.");
        otpHint.textContent = response.previewOtp
          ? `Localhost OTP preview: ${response.previewOtp}`
          : "Check your email inbox for the OTP.";
      } catch (error) {
        UI.showToast(error.message);
      }
    });

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = emailInput.value.trim().toLowerCase();
      const otp = otpInput.value.trim();

      try {
        const response = await Api.verifyOtp(email, otp);
        AppData.saveSession({
          token: response.token,
          userId: response.user._id,
          email: response.user.email,
          role: response.user.role
        });
        UI.showToast("Login successful.");
        modal.classList.add("hidden");
        window.location.reload();
      } catch (error) {
        UI.showToast(error.message);
      }
    });
  };

  const bindGlobalUI = () => {
    UI.applySavedTheme();
    UI.setActiveNav();
    UI.observeReveal();
    UI.renderAuthModal();
    updateAuthButton();

    document.getElementById("themeToggle")?.addEventListener("click", UI.toggleTheme);
    document.getElementById("navToggle")?.addEventListener("click", toggleNav);
    document.getElementById("authTrigger")?.addEventListener("click", () => {
      if (isLoggedIn()) {
        AppData.saveSession(null);
        UI.showToast("Logged out successfully.");
        window.location.reload();
        return;
      }
      showAuthModal();
    });

    renderStudentGate();
  };

  const ensureEvents = async () => {
    if (!state.events.length) {
      state.events = await Api.getEvents();
    }
    return state.events;
  };

  const ensureMyRegistrations = async () => {
    if (!isLoggedIn()) {
      state.registrations = [];
      return [];
    }
    state.registrations = await Api.getMyRegistrations();
    return state.registrations;
  };

  const requireUser = () => {
    const session = getCurrentUser();
    if (!session) {
      UI.showToast("Please log in to continue.");
      showAuthModal();
      return null;
    }
    return session;
  };

  const toggleBookmark = (eventId) => {
    const session = requireUser();
    if (!session) return;
    const bookmarks = AppData.getBookmarks();
    const sessionKey = getSessionKey(session);
    const list = bookmarks[sessionKey] || [];
    bookmarks[sessionKey] = list.includes(eventId)
      ? list.filter((id) => id !== eventId)
      : [...list, eventId];
    AppData.saveBookmarks(bookmarks);
    UI.showToast(list.includes(eventId) ? "Bookmark removed." : "Bookmark added.");
    window.location.reload();
  };

  const bindBookmarkButtons = () => {
    document.querySelectorAll(".bookmark-btn").forEach((button) => {
      button.addEventListener("click", () => toggleBookmark(button.dataset.id));
    });
  };

  const renderHome = async () => {
    const events = await ensureEvents();
    const registrations = await ensureMyRegistrations();
    const featured = events.slice(0, 3);
    if (!featured.length) return;

    document.getElementById("heroEventCount").textContent = events.length;
    document.getElementById("heroRegistrationCount").textContent = registrations.length;
    document.getElementById("heroFeaturedEvent").innerHTML = `
      <img src="${featured[0].image}" alt="${featured[0].title}" />
      <div class="event-card-body">
        <span class="pill">${featured[0].category}</span>
        <h3>${featured[0].title}</h3>
        <p class="event-meta">${UI.formatDateTime(featured[0].date, featured[0].time)}</p>
        <p class="event-meta">${featured[0].description}</p>
      </div>
    `;

    const carousel = document.getElementById("featuredCarousel");
    const upcoming = document.getElementById("upcomingEvents");

    const paintFeatured = () => {
      const current = featured[state.featuredIndex];
      carousel.innerHTML = "";
      carousel.appendChild(UI.createEventCard(current));
      bindBookmarkButtons();
    };

    upcoming.innerHTML = "";
    paintFeatured();
    events.forEach((item) => upcoming.appendChild(UI.createEventCard(item)));
    bindBookmarkButtons();

    document.getElementById("featuredPrev")?.addEventListener("click", () => {
      state.featuredIndex = (state.featuredIndex - 1 + featured.length) % featured.length;
      paintFeatured();
    });
    document.getElementById("featuredNext")?.addEventListener("click", () => {
      state.featuredIndex = (state.featuredIndex + 1) % featured.length;
      paintFeatured();
    });
  };

  const renderEvents = async () => {
    const grid = document.getElementById("eventsGrid");
    if (!grid) return;
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const dateFilter = document.getElementById("dateFilter");
    const clearFilters = document.getElementById("clearFilters");
    const events = await ensureEvents();

    const paint = () => {
      const term = searchInput.value.trim().toLowerCase();
      const category = categoryFilter.value;
      const date = dateFilter.value;

      const filtered = events.filter((event) => {
        const matchesSearch = [event.title, event.venue, event.description, event.category]
          .join(" ")
          .toLowerCase()
          .includes(term);
        const matchesCategory = category ? event.category === category : true;
        const matchesDate = date ? event.date === date : true;
        return matchesSearch && matchesCategory && matchesDate;
      });

      grid.innerHTML = "";
      if (!filtered.length) {
        grid.innerHTML = `<div class="glass-card"><p class="muted-text">No events match your filters.</p></div>`;
        return;
      }
      filtered.forEach((event) => grid.appendChild(UI.createEventCard(event)));
      bindBookmarkButtons();
    };

    [searchInput, categoryFilter, dateFilter].forEach((item) => item?.addEventListener("input", paint));
    clearFilters?.addEventListener("click", () => {
      searchInput.value = "";
      categoryFilter.value = "";
      dateFilter.value = "";
      paint();
    });

    paint();
  };

  const buildTicketMarkup = (registration, event) => `
    <div class="ticket-card" id="ticket-${registration.ticketId}">
      <div class="ticket-card-head">
        <div>
          <span class="pill">${event.category}</span>
          <h3>${event.title}</h3>
        </div>
        <button class="ghost-btn download-ticket-btn" data-ticket="${registration.ticketId}">Download</button>
      </div>
      <div class="ticket-meta">
        <div>${registration.attendeeName}</div>
        <div>${UI.formatDateTime(event.date, event.time)}</div>
        <div>${registration.department || "Student"}</div>
      </div>
      <canvas id="qr-${registration.ticketId}" width="180" height="180"></canvas>
    </div>
  `;

  const drawTicketQR = (registration, event) => {
    const canvas = document.getElementById(`qr-${registration.ticketId}`);
    if (!canvas) return;
    const payload = [
      "Amrita Nexus Ticket",
      `Ticket ID: ${registration.ticketId}`,
      `Event: ${event.title}`,
      `Attendee: ${registration.attendeeName}`,
      `Email: ${registration.userEmail}`
    ].join("\n");
    QRCode.toCanvas(canvas, payload, { width: 180, margin: 1 });
  };

  const downloadTicket = (ticketId) => {
    const registration = state.registrations.find((item) => item.ticketId === ticketId);
    const event = state.events.find((item) => item._id === registration?.eventId);
    if (!registration || !event) return;
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 520;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f6eee6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1b1a18";
    ctx.font = "bold 44px Space Grotesk";
    ctx.fillText("Amrita Nexus Ticket", 48, 80);
    ctx.font = "28px Space Grotesk";
    ctx.fillText(event.title, 48, 160);
    ctx.font = "22px Space Grotesk";
    ctx.fillText(`Attendee: ${registration.attendeeName}`, 48, 220);
    ctx.fillText(`Date: ${UI.formatDateTime(event.date, event.time)}`, 48, 260);
    ctx.fillText(`Venue: ${event.venue}`, 48, 300);
    ctx.fillText(`Ticket ID: ${registration.ticketId}`, 48, 340);
    const qrCanvas = document.getElementById(`qr-${registration.ticketId}`);
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, 630, 140, 200, 200);
    }
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${event.title.toLowerCase().replace(/\s+/g, "-")}-ticket.png`;
    link.click();
  };

  const bindDownloadButtons = () => {
    document.querySelectorAll(".download-ticket-btn").forEach((button) => {
      button.addEventListener("click", () => downloadTicket(button.dataset.ticket));
    });
  };

  const renderTicketPreview = (registration, event) => {
    const holder = document.getElementById("ticketPreview");
    if (!holder) return;
    holder.innerHTML = buildTicketMarkup(registration, event);
    drawTicketQR(registration, event);
    bindDownloadButtons();
  };

  const renderEventDetails = async () => {
    const host = document.getElementById("eventDetails");
    if (!host) return;
    const events = await ensureEvents();
    const params = new URLSearchParams(window.location.search);
    const event = events.find((item) => item._id === params.get("id")) || events[0];
    if (!event) return;

    host.innerHTML = `
      <div class="details-copy glass-card">
        <div class="details-media">
          <img src="${event.image}" alt="${event.title}" />
        </div>
        <span class="pill">${event.category}</span>
        <h1>${event.title}</h1>
        <div class="meta-row">
          <span>${UI.formatDate(event.date)} • ${event.time}</span>
          <span>${event.venue}</span>
        </div>
        <p class="muted-text">${event.description}</p>
        <div class="detail-actions">
          <a class="ghost-btn" href="${UI.buildGoogleCalendarLink(event)}" target="_blank" rel="noreferrer">Add to Google Calendar</a>
          <button class="primary-btn bookmark-btn" data-id="${event._id}">Bookmark</button>
        </div>
      </div>
      <div class="details-side">
        <div class="glass-card">
          <div class="section-head compact">
            <h2>Register</h2>
          </div>
          <form id="registrationForm" class="form-card">
            <input id="regName" type="text" placeholder="Name" required />
            <input id="regEmail" type="email" placeholder="Email" required />
            <input id="regDept" type="text" placeholder="Department" required />
            <button class="primary-btn" type="submit">Generate Ticket</button>
          </form>
        </div>
        <iframe src="${event.map}" title="${event.title} venue map"></iframe>
        <div id="ticketPreview"></div>
      </div>
    `;

    const session = getCurrentUser();
    const emailInput = document.getElementById("regEmail");
    if (session && emailInput) {
      emailInput.value = session.email;
      emailInput.readOnly = true;
    }

    bindBookmarkButtons();
    document.getElementById("registrationForm")?.addEventListener("submit", async (submitEvent) => {
      submitEvent.preventDefault();
      const activeSession = requireUser();
      if (!activeSession) return;

      try {
        const registration = await Api.registerEvent({
          eventId: event._id,
          attendeeName: document.getElementById("regName").value.trim(),
          department: document.getElementById("regDept").value.trim()
        });
        UI.showToast("Registration successful. Ticket generated.");
        state.registrations = [...state.registrations, registration];
        renderTicketPreview(registration, event);
      } catch (error) {
        UI.showToast(error.message);
      }
    });
  };

  const renderDashboard = async () => {
    const registeredList = document.getElementById("registeredEventsList");
    const ticketsList = document.getElementById("ticketsList");
    if (!registeredList) return;

    if (!isLoggedIn()) {
      document.getElementById("registeredCount").textContent = "0";
      document.getElementById("bookmarkCount").textContent = "0";
      document.getElementById("ticketCount").textContent = "0";
      registeredList.innerHTML = `<p class="muted-text">Log in to see your dashboard.</p>`;
      ticketsList.innerHTML = `<p class="muted-text">Tickets will appear here after registration.</p>`;
      renderDashboardCharts([], []);
      return;
    }

    const events = await ensureEvents();
    const registrations = await ensureMyRegistrations();
    const bookmarks = AppData.getBookmarks()[getSessionKey(getCurrentUser())] || [];
    const bookmarkEvents = events.filter((event) => bookmarks.includes(event._id));
    const registeredEvents = registrations.map((registration) => ({
      registration,
      event: events.find((event) => event._id === registration.eventId)
    })).filter((item) => item.event);

    document.getElementById("registeredCount").textContent = registrations.length;
    document.getElementById("bookmarkCount").textContent = bookmarkEvents.length;
    document.getElementById("ticketCount").textContent = registrations.length;

    registeredList.innerHTML = registeredEvents.length
      ? registeredEvents.map(({ event, registration }) => `
          <div class="list-row">
            <div>
              <strong>${event.title}</strong>
              <div class="ticket-meta">${UI.formatDateTime(event.date, event.time)}</div>
            </div>
            <span>${registration.ticketId}</span>
          </div>
        `).join("")
      : `<p class="muted-text">No registrations yet.</p>`;

    ticketsList.innerHTML = registeredEvents.length
      ? registeredEvents.map(({ event, registration }) => `
          <div class="list-row">
            <div>
              <strong>${registration.ticketId}</strong>
              <div class="ticket-meta">${event.title}</div>
            </div>
            <span>${UI.formatDate(event.date)}</span>
          </div>
        `).join("")
      : `<p class="muted-text">No tickets yet.</p>`;

    renderDashboardCharts(registrations, events);
  };

  const renderDashboardCharts = (registrations, events) => {
    if (typeof Chart === "undefined") return;
    const barCanvas = document.getElementById("registrationsChart");
    const pieCanvas = document.getElementById("categoryChart");
    if (!barCanvas || !pieCanvas) return;

    const eventCounts = events.map((event) => ({
      label: event.title,
      value: registrations.filter((item) => item.eventId === event._id).length
    }));

    const categoryCounts = registrations.reduce((accumulator, item) => {
      const event = events.find((entry) => entry._id === item.eventId);
      if (!event) return accumulator;
      accumulator[event.category] = (accumulator[event.category] || 0) + 1;
      return accumulator;
    }, {});

    if (state.barChart) state.barChart.destroy();
    if (state.pieChart) state.pieChart.destroy();

    state.barChart = new Chart(barCanvas, {
      type: "bar",
      data: {
        labels: eventCounts.map((item) => item.label),
        datasets: [{
          label: "Registrations",
          data: eventCounts.map((item) => item.value),
          borderRadius: 12,
          backgroundColor: "#4F46E5"
        }]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });

    state.pieChart = new Chart(pieCanvas, {
      type: "pie",
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [{
          data: Object.values(categoryCounts),
          backgroundColor: ["#4F46E5", "#6366F1", "#F28B64", "#E85BA6"]
        }]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } }
      }
    });
  };

  const renderAdmin = async () => {
    const grid = document.getElementById("adminEventsGrid");
    if (!grid) return;
    const gate = document.getElementById("adminGate");
    const panel = document.getElementById("adminPanelContent");
    const toggleRegistrationViewButton = document.getElementById("toggleRegistrationView");
    let registrationViewMode = "table";

    if (!isLoggedIn() || !isAdmin()) {
      gate.classList.remove("hidden-section");
      panel.classList.remove("visible-section");
      gate.innerHTML = `
        <p class="eyebrow">Secure Access</p>
        <h2>Admin login required</h2>
        <p class="muted-text">Log in with an admin email through OTP to open the management console.</p>
        <button class="primary-btn" id="openAdminLogin">Open Login</button>
      `;
      document.getElementById("openAdminLogin")?.addEventListener("click", showAuthModal);
      return;
    }

    gate.classList.add("hidden-section");
    panel.classList.add("visible-section");

    const renderAnalytics = async () => {
      const registrations = await Api.getAdminRegistrations();
      const events = await ensureEvents();
      const counts = registrations.reduce((accumulator, item) => {
        accumulator[item.eventId] = (accumulator[item.eventId] || 0) + 1;
        return accumulator;
      }, {});
      const popularEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const popular = events.find((item) => item._id === popularEntry?.[0]);

      document.getElementById("popularEvent").textContent = popular ? popular.title : "No data";
      document.getElementById("totalRegistrations").textContent = registrations.length;
      document.getElementById("totalEvents").textContent = events.length;
      document.getElementById("registrationTable").innerHTML = registrations.length
        ? (registrationViewMode === "table"
            ? `
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Event</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Ticket ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${registrations.map((item) => `
                      <tr>
                        <td>${item.userId?.email || "-"}</td>
                        <td>${item.eventId?.title || "-"}</td>
                        <td>${item.attendeeName}</td>
                        <td>${item.department || "-"}</td>
                        <td>${item.ticketId}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              `
            : events.map((event) => {
                const eventRegistrations = registrations.filter((item) => item.eventId?._id === event._id);
                if (!eventRegistrations.length) return "";
                return `
                  <div class="registration-group">
                    <h3>${event.title}</h3>
                    <div class="stack-list">
                      ${eventRegistrations.map((item) => `
                        <div class="list-row">
                          <div>
                            <strong>${item.attendeeName}</strong>
                            <div class="ticket-meta">${item.userId?.email || "-"}</div>
                          </div>
                          <span>${item.department || "-"}</span>
                        </div>
                      `).join("")}
                    </div>
                  </div>
                `;
              }).join(""))
        : `<p class="muted-text">No registrations recorded yet.</p>`;
    };

    const paintAdmin = async () => {
      const events = await ensureEvents();
      grid.innerHTML = "";
      events.forEach((event) => grid.appendChild(UI.createEventCard({ ...event, id: event._id }, { admin: true })));
      bindAdminActions();
      await renderAnalytics();
    };

    const resetAdminForm = () => {
      document.getElementById("eventForm").reset();
      document.getElementById("eventId").value = "";
      document.getElementById("existingEventImage").value = "";
      document.getElementById("adminFormTitle").textContent = "Create Event";
    };

    document.getElementById("eventForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const imageInput = document.getElementById("eventImage");
      const existingImage = document.getElementById("existingEventImage").value.trim();
      let imageValue = existingImage;

      if (imageInput.files?.[0]) {
        imageValue = await readFileAsDataUrl(imageInput.files[0]);
      }

      const payload = {
        title: document.getElementById("eventTitle").value.trim(),
        venue: document.getElementById("eventVenue").value.trim(),
        date: document.getElementById("eventDate").value,
        time: document.getElementById("eventTime").value,
        category: document.getElementById("eventCategory").value,
        image: imageValue,
        map: normalizeMapUrl(document.getElementById("eventMap").value.trim(), document.getElementById("eventVenue").value.trim()),
        description: document.getElementById("eventDescription").value.trim()
      };

      try {
        const eventId = document.getElementById("eventId").value;
        if (eventId) {
          await Api.updateEvent(eventId, payload);
          UI.showToast("Event updated.");
        } else {
          await Api.createEvent(payload);
          UI.showToast("Event created.");
        }
        state.events = [];
        resetAdminForm();
        await paintAdmin();
      } catch (error) {
        UI.showToast(error.message);
      }
    });

    document.getElementById("resetAdminForm")?.addEventListener("click", resetAdminForm);
    toggleRegistrationViewButton?.addEventListener("click", async () => {
      registrationViewMode = registrationViewMode === "table" ? "grouped" : "table";
      toggleRegistrationViewButton.textContent = registrationViewMode === "table" ? "View By Event" : "View Table";
      await renderAnalytics();
    });

    const bindAdminActions = () => {
      document.querySelectorAll(".edit-event-btn").forEach((button) => {
        button.addEventListener("click", () => {
          const target = state.events.find((item) => item._id === button.dataset.id);
          if (!target) return;
          document.getElementById("eventId").value = target._id;
          document.getElementById("existingEventImage").value = target.image;
          document.getElementById("eventTitle").value = target.title;
          document.getElementById("eventDate").value = target.date;
          document.getElementById("eventTime").value = target.time;
          document.getElementById("eventVenue").value = target.venue;
          document.getElementById("eventCategory").value = target.category;
          document.getElementById("eventMap").value = target.map;
          document.getElementById("eventDescription").value = target.description;
          document.getElementById("adminFormTitle").textContent = "Edit Event";
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });

      document.querySelectorAll(".delete-event-btn").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            await Api.deleteEvent(button.dataset.id);
            UI.showToast("Event deleted.");
            state.events = [];
            await paintAdmin();
          } catch (error) {
            UI.showToast(error.message);
          }
        });
      });
    };

    await paintAdmin();
  };

  const renderContact = () => {
    document.getElementById("contactForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const contacts = AppData.getContacts();
      contacts.push({
        id: `contact-${Date.now()}`,
        name: document.getElementById("contactName").value.trim(),
        message: document.getElementById("contactMessage").value.trim(),
        createdAt: new Date().toISOString()
      });
      AppData.saveContacts(contacts);
      event.target.reset();
      UI.showToast("Message saved locally.");
    });
  };

  const init = async () => {
    bindGlobalUI();
    const page = document.body.dataset.page;

    try {
      if (page === "home") await renderHome();
      if (page === "events") await renderEvents();
      if (window.location.pathname.endsWith("event.html")) await renderEventDetails();
      if (page === "dashboard") await renderDashboard();
      if (page === "admin") await renderAdmin();
      if (page === "contact") renderContact();
    } catch (error) {
      console.error(error);
      UI.showToast(error.message || "Could not load data from backend.");
    }
  };

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
