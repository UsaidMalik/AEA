// node-seeder/seed.js

const { MongoClient } = require("mongodb");

const uri = "mongodb://aea:aea_dev_pwd@localhost:27017";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("aea");

    const session_id = "demo-session-001";
    const now = new Date();

    // 1. sessions
    await db.collection("sessions").insertOne({
      session_id,
      user_id: "user-001",
      started_at: now,
      ended_at: new Date(now.getTime() + 45 * 60000), // 45 mins later
      config_name: "study_default",
      web_policy: {
        allow: ["wikipedia.org", "jstor.org"],
        deny: ["youtube.com", "instagram.com"],
        wildcard: true,
      },
      app_policy: {
        allow: ["code.exe", "notepad.exe"],
        deny: ["tiktok.exe", "steam.exe"],
      },
      vision_policy: {
        require_presence: true,
        away_grace_sec: 5,
      },
      stats: {
        focus_pct: 0.84,
        away_secs: 390,
        violations: {
          web: 2,
          app: 1,
          affect: 2,
        },
      },
      schema_version: 1,
    });

    // 2. apps
    await db.collection("apps").insertMany([
      {
        session_id,
        ts_open: now,
        ts_close: new Date(now.getTime() + 20 * 60000),
        app_name: "code.exe",
        window_title: "VSCode — AEA Project",
        policy: { allowed: true, rule: "app_allow" },
        action_taken: "ignored",
        notification: { sent: false },
        schema_version: 1,
      },
      {
        session_id,
        ts_open: new Date(now.getTime() + 25 * 60000),
        ts_close: new Date(now.getTime() + 30 * 60000),
        app_name: "steam.exe",
        window_title: "Steam Client",
        policy: { allowed: false, rule: "app_deny" },
        action_taken: "blocked",
        notification: { sent: true, ts: new Date(now.getTime() + 25 * 60000) },
        schema_version: 1,
      },
    ]);

    // 3. web
    await db.collection("web").insertMany([
      {
        session_id,
        ts_open: new Date(now.getTime() + 5 * 60000),
        ts_close: new Date(now.getTime() + 15 * 60000),
        domain: "wikipedia.org",
        url_hash: "hash_wikipedia",
        policy: { allowed: true, rule: "web_allow" },
        action_taken: "ignored",
        notification: { sent: false },
        affect: { label: "neutral", confidence: 0.78 },
        schema_version: 1,
      },
      {
        session_id,
        ts_open: new Date(now.getTime() + 20 * 60000),
        ts_close: new Date(now.getTime() + 23 * 60000),
        domain: "instagram.com",
        url_hash: "hash_instagram",
        policy: { allowed: false, rule: "web_deny" },
        action_taken: "notified",
        notification: { sent: true, ts: new Date(now.getTime() + 20 * 60000) },
        affect: { label: "happy", confidence: 0.91 },
        schema_version: 1,
      },
    ]);

    // 4. camera_events
    await db.collection("camera_events").insertMany([
      {
        session_id,
        ts: new Date(now.getTime() + 60000),
        presence: { state: "present", confidence: 0.99 },
        posture: { indicator: "upright", confidence: 0.88 },
        affect: { label: "neutral", confidence: 0.76 },
        schema_version: 1,
      },
      {
        session_id,
        ts: new Date(now.getTime() + 30 * 60000),
        presence: { state: "present", confidence: 0.95 },
        posture: { indicator: "slouch", confidence: 0.61 },
        affect: { label: "distressed", confidence: 0.67 },
        schema_version: 1,
      },
    ]);

    // 5. interventions
    await db.collection("interventions").insertMany([
      {
        session_id,
        ts: new Date(now.getTime() + 20 * 60000),
        nudge_type: "toast",
        trigger_reason: "web_deny",
        action_payload: {
          domain: "instagram.com",
          rule: "deny",
        },
        user_response: "clicked",
        follow_up_result: "success",
        latency_ms: 850,
        schema_version: 1,
      },
      {
        session_id,
        ts: new Date(now.getTime() + 30 * 60000),
        nudge_type: "banner",
        trigger_reason: "affect_threshold",
        action_payload: {
          label: "distressed",
          confidence: 0.67,
        },
        user_response: "ignored",
        follow_up_result: "snoozed",
        latency_ms: 1200,
        schema_version: 1,
      },
    ]);

    // 6. configs
    await db.collection("configs").insertOne({
      name: "study_default",
      json: {
        action: "study",
        apps: {
          allow: ["code.exe"],
          deny: ["tiktok.exe"],
        },
        web: {
          allow: ["wikipedia.org"],
          deny: ["youtube.com"],
          wildcard: true,
        },
        vision: {
          require_presence: true,
          away_grace_sec: 5,
        },
        nudges: {
          cooldown_sec: 30,
          channels: ["toast", "banner"],
        },
        actions: {
          on_ban: "notify",
          on_away: "notify",
          on_affect: "suggest",
        },
      },
      source: "preset",
      prompt: null,
      created_ts: now,
      updated_ts: now,
      schema_version: 1,
    });

    // 7. predictions
    await db.collection("predictions").insertOne({
      session_id,
      ts_generated: new Date(now.getTime() + 45 * 60000),
      models: {
        focus_forecast: [0.89, 0.83, 0.77],
        optimal_schedule: {
          slots: ["10:00–12:00", "14:00–16:00"],
        },
        risk_flags: ["slouching", "web_drift"],
      },
      input_span: {
        start: now,
        end: new Date(now.getTime() + 45 * 60000),
      },
      schema_version: 1,
    });

    console.log("✅ All data seeded successfully into AEA MongoDB!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await client.close();
  }
}

run();
