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
  const getValue = (item, key) => key.split(".").reduce((value, part) => value?.[part], item);
  const matchesQuery = (item, query = {}) => Object.entries(query).every(([key, value]) => {
    const actual = getValue(item, key);
    if (value && typeof value === "object" && "$in" in value) {
      return value.$in.map(String).includes(String(actual));
    }
    return String(actual) === String(value);
  });
  const collectionForPath = (pathName) => ({
    userId: "users",
    eventId: "events"
  }[pathName]);
  const makeId = () => new mongoose.Types.ObjectId().toString();

  // Override connect to always succeed
  mongoose.connect = async () => {
    console.log("Using local JSON File Database Mock (Offline fallback).");
    return mongoose.connection;
  };

  const hookModel = (model) => {
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

    const hydrate = (items, populates = []) => {
      const db = readDb();
      return items.map((item) => {
        const copy = { ...item };
        populates.forEach((populateConfig) => {
          const pathName = typeof populateConfig === "string" ? populateConfig : populateConfig.path;
          const targetCollection = collectionForPath(pathName);
          if (!targetCollection || !copy[pathName]) return;
          const target = (db[targetCollection] || []).find((entry) => String(entry._id || entry.id) === String(copy[pathName]));
          if (target) copy[pathName] = target;
        });
        return toDoc(copy);
      });
    };

    const makeQuery = (items) => {
      const state = { sortSpec: null, populates: [], selectSpec: null };
      const query = {
        sort(spec) {
          state.sortSpec = spec;
          return query;
        },
        populate(pathName, select) {
          state.populates.push(typeof pathName === "string" ? { path: pathName, select } : pathName);
          return query;
        },
        select(spec) {
          state.selectSpec = spec;
          return query;
        },
        exec() {
          return Promise.resolve(query.toArray());
        },
        toArray() {
          let result = [...items];
          if (state.sortSpec) {
            const entries = Object.entries(state.sortSpec);
            result.sort((a, b) => {
              for (const [key, direction] of entries) {
                const av = getValue(a, key);
                const bv = getValue(b, key);
                if (av === bv) continue;
                return av > bv ? direction : -direction;
              }
              return 0;
            });
          }
          return hydrate(result, state.populates);
        },
        then(resolve, reject) {
          return query.exec().then(resolve, reject);
        },
        catch(reject) {
          return query.exec().catch(reject);
        }
      };
      return query;
    };

    model.findOne = async function(query) {
      const db = readDb();
      const items = db[collectionName] || [];
      const found = items.find((item) => matchesQuery(item, query));
      return toDoc(found);
    };

    model.find = function(query = {}) {
      const db = readDb();
      const items = db[collectionName] || [];
      const found = !query || Object.keys(query).length === 0
        ? items
        : items.filter((item) => matchesQuery(item, query));
      return makeQuery(found);
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
          item._id = makeId();
        }
        item.createdAt = item.createdAt || new Date().toISOString();
        item.updatedAt = new Date().toISOString();
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
      items[idx].updatedAt = new Date().toISOString();
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
      const idx = items.findIndex((item) => matchesQuery(item, query));
      if (idx === -1) return { deletedCount: 0 };
      items.splice(idx, 1);
      db[collectionName] = items;
      writeDb(db);
      return { deletedCount: 1 };
    };

    model.countDocuments = async function(query = {}) {
      const db = readDb();
      const items = db[collectionName] || [];
      return items.filter((item) => matchesQuery(item, query)).length;
    };

    model.insertMany = async function(items) {
      return model.create(items);
    };

    model.aggregate = async function(pipeline = []) {
      let rows = [...(readDb()[collectionName] || [])];
      for (const stage of pipeline) {
        if (stage.$group) {
          const idField = String(stage.$group._id || "").replace(/^\$/, "");
          const grouped = new Map();
          rows.forEach((row) => {
            const key = getValue(row, idField);
            const current = grouped.get(String(key)) || { _id: key };
            Object.entries(stage.$group).forEach(([field, expression]) => {
              if (field === "_id") return;
              if (expression.$sum === 1) current[field] = (current[field] || 0) + 1;
              if (expression.$max) {
                const value = getValue(row, String(expression.$max).replace(/^\$/, ""));
                current[field] = !current[field] || value > current[field] ? value : current[field];
              }
            });
            grouped.set(String(key), current);
          });
          rows = [...grouped.values()];
        }
        if (stage.$sort) {
          rows.sort((a, b) => {
            for (const [key, direction] of Object.entries(stage.$sort)) {
              const av = getValue(a, key);
              const bv = getValue(b, key);
              if (av === bv) continue;
              return av > bv ? direction : -direction;
            }
            return 0;
          });
        }
        if (stage.$limit) rows = rows.slice(0, stage.$limit);
      }
      return rows;
    };

    return model;
  };

  mongoose.modelNames().forEach((name) => hookModel(mongoose.model(name)));

  // Override future model compilation too, for any late-loaded model.
  const originalModel = mongoose.model.bind(mongoose);
  mongoose.model = function(name, schema) {
    const model = schema ? originalModel(name, schema) : originalModel(name);
    return hookModel(model);
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
