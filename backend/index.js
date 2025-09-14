import express from "express";
import { MongoClient } from "mongodb";
import paginatedRoutes from "./routes.js";
import llmQueryRoute from "./llmQueryRoute.js";

const app = express();
const port = 12039;
const client = new MongoClient("mongodb://aea:aea_dev_pwd@localhost:27017");

app.use(express.json());

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

// POST ingestion routes
app.post("/api/session/start", async (req, res) => {
  const db = req.app.locals.db;
  await db.collection("sessions").insertOne(req.body);
  res.json({ ok: true });
});
app.post("/api/events/apps", async (req, res) => {
  const db = req.app.locals.db;
  await db.collection("apps").insertMany(req.body);
  res.json({ ok: true });
});
app.post("/api/events/web", async (req, res) => {
  const db = req.app.locals.db;
  await db.collection("web").insertMany(req.body);
  res.json({ ok: true });
});
app.post("/api/events/camera", async (req, res) => {
  const db = req.app.locals.db;
  await db.collection("camera_events").insertMany(req.body);
  res.json({ ok: true });
});
app.post("/api/events/interventions", async (req, res) => {
  const db = req.app.locals.db;
  await db.collection("interventions").insertMany(req.body);
  res.json({ ok: true });
});

// Start server
app.listen(port, async () => {
  try {
    await client.connect();
    const db = client.db("aea");
    app.locals.db = db;

    // ✅ Register smart query route FIRST to match /api/query
    app.use('/api', llmQueryRoute);

    // ✅ Then register paginated routes
    app.use('/api', paginatedRoutes);

    console.log(`🚀 AEA backend running at http://localhost:${port}`);
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err);
  }
});
