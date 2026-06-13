const UI = (() => {
  const toastContainer = () => document.getElementById("toastContainer");

  const showToast = (message) => {
    const holder = toastContainer();
    if (!holder) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    holder.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  };

  const toggleTheme = () => {
    const current = document.body.classList.toggle("dark") ? "dark" : "light";
    AppData.saveTheme(current);
  };

  const applySavedTheme = () => {
    const theme = AppData.getTheme();
    document.body.classList.toggle("dark", theme === "dark");
  };

  const setActiveNav = () => {
    const page = document.body.dataset.page;
    document.querySelectorAll("[data-link]").forEach((link) => {
      link.classList.toggle("active", link.dataset.link === page);
    });
  };

  const observeReveal = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, { threshold: 0.14 });

    document.querySelectorAll(".reveal").forEach((item) => observer.observe(item));
  };

  const createEventCard = (event, options = {}) => {
    const session = AppData.getSession();
    const bookmarks = AppData.getBookmarks();
    const eventId = event._id || event.id;
    const sessionKey = session ? (session.email || session.username) : "";
    const currentBookmarks = session ? (bookmarks[sessionKey] || []) : [];
    const isBookmarked = currentBookmarks.includes(eventId);
    const wrapper = document.createElement("article");
    wrapper.className = "event-card";
    wrapper.innerHTML = `
      <img src="${event.image}" alt="${event.title}" />
      <div class="event-card-body">
        <div class="event-card-head">
          <h3>${event.title}</h3>
          <span class="category-badge">${event.category}</span>
        </div>
        <p class="event-meta">${formatDate(event.date)} • ${event.time} • ${event.venue}</p>
        <p class="event-meta">${event.description}</p>
        <div class="detail-actions">
          <a class="primary-btn" href="event.html?id=${eventId}">View Details</a>
          <button class="ghost-btn bookmark-btn" data-id="${eventId}">
            ${isBookmarked ? "Saved" : "Bookmark"}
          </button>
        </div>
      </div>
    `;

    if (options.admin) {
      wrapper.querySelector(".detail-actions").innerHTML = `
        <button class="primary-btn edit-event-btn" data-id="${eventId}">Edit</button>
        <button class="ghost-btn delete-event-btn" data-id="${eventId}">Delete</button>
      `;
    }

    return wrapper;
  };

  const formatDate = (dateString) => new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const formatDateTime = (date, time) => new Date(`${date}T${time}`).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  const buildGoogleCalendarLink = (event) => {
    const start = new Date(`${event.date}T${event.time}`);
    const end = new Date(start.getTime() + (2 * 60 * 60 * 1000));
    const toStamp = (value) => value.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: event.title,
      dates: `${toStamp(start)}/${toStamp(end)}`,
      details: event.description,
      location: event.venue
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const renderAuthModal = () => {
    const modal = document.getElementById("authModal");
    if (!modal) return;
    modal.innerHTML = `
      <div class="glass-card modal-card">
        <div class="section-head compact">
          <h2>Email OTP Login</h2>
          <button class="ghost-btn" id="closeAuthModal">Close</button>
        </div>
        <form id="authForm" class="form-card">
          <input id="authUsername" type="email" placeholder="Gmail address" required />
          <button class="ghost-btn" type="button" id="sendOtpBtn">Send OTP</button>
          <input id="authOtp" type="text" placeholder="Enter OTP" maxlength="6" required />
          <button class="primary-btn" type="submit" id="authSubmit">Verify OTP</button>
          <p class="form-note">Use a valid email address. Admin access is decided by backend role.</p>
          <p class="form-note" id="otpHint"></p>
        </form>
      </div>
    `;
  };

  return {
    showToast,
    toggleTheme,
    applySavedTheme,
    setActiveNav,
    observeReveal,
    createEventCard,
    formatDate,
    formatDateTime,
    buildGoogleCalendarLink,
    renderAuthModal
  };
})();
