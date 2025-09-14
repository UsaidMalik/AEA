import express from "express";
import { MongoClient } from "mongodb";
import paginatedRoutes from "./routes.js";
import llmQueryRoute from "./llmQueryRoute.js";


const app = express();
const port = 12039;

const client = new MongoClient("mongodb://aea:aea_dev_pwd@localhost:27017");

app.use(express.json());

app.use("/api", llmQueryRoute); // smart LLM query route
app.use("/api", paginatedRoutes); // paginated data browsing


// POST /api/session/start
app.post("/api/session/start", async (req, res) => {
  const db = req.app.locals.db;
  await db.collection("sessions").insertOne(req.body);
  res.json({ ok: true });
});

// POST /api/events/apps
app.post("/api/events/apps", async (req, res) => {
  const db = req.app.locals.db;
  await db.collection("apps").insertMany(req.body);
  res.json({ ok: true });
});

// POST /api/events/web
app.post("/api/events/web", async (req, res) => {
  const db = req.app.locals.db;
  await db.collection("web").insertMany(req.body);
  res.json({ ok: true });
});

// POST /api/events/camera
app.post("/api/events/camera", async (req, res) => {
  const db = req.app.locals.db;
  await db.collection("camera_events").insertMany(req.body);
  res.json({ ok: true });
});

// POST /api/events/interventions
app.post("/api/events/interventions", async (req, res) => {
  const db = req.app.locals.db;
  await db.collection("interventions").insertMany(req.body);
  res.json({ ok: true });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.command({ ping: 1 });
    res.send('✅ MongoDB connected successfully!');
  } catch (err) {
    res.status(500).send('❌ MongoDB NOT connected');
  }
});

// Start the server and connect to MongoDB
app.listen(port, async () => {
  try {
    await client.connect();
    const db = client.db("aea");
    app.locals.db = db;

    // ✅ Register paginated routes AFTER db is attached to app
    app.use("/api", paginatedRoutes);

    console.log(`🚀 AEA backend running at http://localhost:${port}`);
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err);
  }
});


// endpoint examples
// POST /api/session/start
// GET /api/sessions?page=1&limit=10
