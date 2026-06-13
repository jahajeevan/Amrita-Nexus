const Api = (() => {
  // The frontend always talks to the local Express API on port 5001.
  const BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5001/api"
    : "http://localhost:5001/api";

  const request = async (path, options = {}) => {
    const session = AppData.getSession();
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
  };

  return {
    sendOtp: (email) => request("/send-otp", {
      method: "POST",
      body: JSON.stringify({ email })
    }),
    verifyOtp: (email, otp) => request("/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp })
    }),
    getEvents: () => request("/events"),
    createEvent: (payload) => request("/events", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    updateEvent: (id, payload) => request(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
    deleteEvent: (id) => request(`/events/${id}`, {
      method: "DELETE"
    }),
    registerEvent: (payload) => request("/register-event", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
    getMyRegistrations: () => request("/my-registrations"),
    getAdminRegistrations: () => request("/admin/registrations")
  };
})();
