const Event = require("../models/Event");

const seededEvents = [
  {
    title: "AI Build Summit",
    description: "A high-energy summit featuring product demos, AI talks, and rapid prototyping sprints for campus builders.",
    date: "2026-05-10",
    time: "09:30",
    venue: "Innovation Hall",
    venueMap: "https://www.google.com/maps/search/?api=1&query=Innovation%20Hall%20Amrita%20University",
    category: "Tech",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Midnight Code Relay",
    description: "A relay-style hack challenge where teams hand over features across timed engineering rounds.",
    date: "2026-05-12",
    time: "18:00",
    venue: "Lab Block 3",
    venueMap: "https://www.google.com/maps/search/?api=1&query=Lab%20Block%203%20Amrita%20University",
    category: "Tech",
    image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Raaga Nights",
    description: "An immersive evening of live music, dance performances, and collaborative stage acts from across departments.",
    date: "2026-05-15",
    time: "17:30",
    venue: "Open Air Theatre",
    venueMap: "https://www.google.com/maps/search/?api=1&query=Open%20Air%20Theatre%20Amrita%20University",
    category: "Cultural",
    image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Champions Turf Cup",
    description: "Inter-department competition with live scoreboards, fan zones, and performance tracking.",
    date: "2026-05-20",
    time: "07:00",
    venue: "Main Sports Arena",
    venueMap: "https://www.google.com/maps/search/?api=1&query=Main%20Sports%20Arena%20Amrita%20University",
    category: "Sports",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Amrita Innovation Expo",
    description: "A showcase of student projects, demos, and startup-ready campus innovation.",
    date: "2026-05-22",
    time: "10:00",
    venue: "Amriteshwari Hall",
    venueMap: "https://www.google.com/maps/search/?api=1&query=Amriteshwari%20Hall%20Amrita%20University",
    category: "Expo",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80"
  }
];

const seedEvents = async () => {
  if (String(process.env.SEED_DEFAULT_EVENTS || "false") !== "true") {
    return;
  }
  const count = await Event.countDocuments();
  if (count === 0) {
    await Event.insertMany(seededEvents);
    console.log("Seeded default events.");
  }
};

module.exports = seedEvents;
