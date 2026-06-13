const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

function setupMongooseMock() {
  const dbFile = path.join(__dirname, "../mock_db.json");

  // Initialize mock JSON db if it doesn't exist
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({
      users: [],
      events: [],
      registrations: [],
      contactmessages: []
    }, null, 2));
  }

  const readDb = () => JSON.parse(fs.readFileSync(dbFile, "utf8"));
  const writeDb = (data) => fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));

  // Override connect to always succeed
  mongoose.connect = async () => {
    console.log("Using local JSON File Database Mock (Offline fallback).");
    return mongoose.connection;
  };

  // Override model compilation to hook query methods
  const originalModel = mongoose.model.bind(mongoose);
  mongoose.model = function(name, schema) {
    const model = originalModel(name, schema);
    const collectionName = model.collection.name; // e.g. "users", "events"

    // Helper to map document to mongoose document
    const toDoc = (data) => {
      if (!data) return null;
      const doc = new model(data);
      doc.$__save = doc.save; // save original
      doc.save = async function() {
        const db = readDb();
        const items = db[collectionName] || [];
        const idx = items.findIndex(item => String(item._id || item.id) === String(this._id || this.id));
        const serialized = this.toObject();
        if (idx !== -1) {
          items[idx] = serialized;
        } else {
          items.push(serialized);
        }
        db[collectionName] = items;
        writeDb(db);
        return this;
      };
      return doc;
    };

    // Override static query methods
    model.findOne = async function(query) {
      const db = readDb();
      const items = db[collectionName] || [];
      const found = items.find(item => {
        for (let key in query) {
          if (String(item[key]) !== String(query[key])) return false;
        }
        return true;
      });
      return toDoc(found);
    };

    model.find = async function(query) {
      const db = readDb();
      const items = db[collectionName] || [];
      if (!query || Object.keys(query).length === 0) {
        return items.map(toDoc);
      }
      const found = items.filter(item => {
        for (let key in query) {
          if (String(item[key]) !== String(query[key])) return false;
        }
        return true;
      });
      return found.map(toDoc);
    };

    model.findById = async function(id) {
      return model.findOne({ _id: id });
    };

    model.create = async function(data) {
      const db = readDb();
      const items = db[collectionName] || [];
      const itemData = data instanceof Array ? data : [data];
      const createdDocs = [];

      for (let item of itemData) {
        if (!item._id && !item.id) {
          item._id = "mock_" + Date.now() + Math.random().toString(36).substring(2, 7);
        }
        items.push(item);
        createdDocs.push(toDoc(item));
      }

      db[collectionName] = items;
      writeDb(db);
      return data instanceof Array ? createdDocs : createdDocs[0];
    };

    model.findByIdAndUpdate = async function(id, update) {
      const db = readDb();
      const items = db[collectionName] || [];
      const idx = items.findIndex(item => String(item._id || item.id) === String(id));
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...(update.$set || update) };
      db[collectionName] = items;
      writeDb(db);
      return toDoc(items[idx]);
    };

    model.findByIdAndDelete = async function(id) {
      const db = readDb();
      let items = db[collectionName] || [];
      const found = items.find(item => String(item._id || item.id) === String(id));
      if (!found) return null;
      items = items.filter(item => String(item._id || item.id) !== String(id));
      db[collectionName] = items;
      writeDb(db);
      return toDoc(found);
    };

    model.deleteOne = async function(query) {
      const db = readDb();
      let items = db[collectionName] || [];
      const idx = items.findIndex(item => {
        for (let key in query) {
          if (String(item[key]) !== String(query[key])) return false;
        }
        return true;
      });
      if (idx === -1) return { deletedCount: 0 };
      items.splice(idx, 1);
      db[collectionName] = items;
      writeDb(db);
      return { deletedCount: 1 };
    };

    return model;
  };
}

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/amrita_nexus";
  
  try {
    console.log("Attempting database connection...");
    // Try to connect with a short timeout to prevent hanging on DNS error
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2500 });
    console.log("MongoDB connected successfully.");

    try {
      const registrations = mongoose.connection.db.collection("registrations");
      const indexes = await registrations.indexes();
      const staleTicketIndex = indexes.find((index) => index.name === "ticketId_1");

      if (staleTicketIndex) {
        await registrations.dropIndex("ticketId_1");
        console.log("Dropped stale registrations.ticketId_1 index.");
      }
    } catch (error) {
      if (error?.codeName !== "NamespaceNotFound") {
        console.warn("Registration index cleanup skipped:", error.message);
      }
    }
  } catch (error) {
    console.warn("MongoDB connection failed! Error:", error.message);
    console.warn(">>> Switching to Local JSON File Database Mock Mode <<<");
    setupMongooseMock();
  }
};

module.exports = connectDB;
