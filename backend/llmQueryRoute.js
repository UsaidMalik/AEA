// backend/llmQueryRoute.js
import express from "express";
import { queryOllama } from "./ollamaQuery.js";

const router = express.Router();

const allowedCollections = ["web", "apps", "camera_events", "interventions"];

router.post("/query", async (req, res) => {
  const { question, session_id } = req.body;

  if (!question || !session_id) {
    return res.status(400).json({ error: "Missing question or session_id" });
  }

  const db = req.app.locals.db;

  try {
    const rawResponse = await queryOllama(question);
    console.log("🧠 LLM Raw Output:", rawResponse);

    let parsed;
    try {
      parsed = JSON.parse(rawResponse);
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "LLM returned invalid JSON",
        raw: rawResponse
      });
    }

    const { collection, filter, projection } = parsed;

    if (!allowedCollections.includes(collection)) {
      return res.status(400).json({
        success: false,
        error: `Invalid collection: ${collection}`
      });
    }

    const results = await db
      .collection(collection)
      .find({ ...filter, session_id }, projection || {})
      .toArray();

    res.json({
      success: true,
      query: { collection, filter, projection },
      results
    });
  } catch (err) {
    console.error("❌ LLM Query Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "LLM query failed"
    });
  }
});

router.get("/query/test", (req, res) => {
  res.json({
    example_question: "When did I visit Instagram and look happy?",
    expected_request_body: {
      question: "When did I visit Instagram and look happy?",
      session_id: "demo-session-001"
    }
  });
});

export default router;