// src/mockData.ts
// 👶 All example/mock data for the dashboard

export const mockSession = {
  session_id: "123e4567-e89b-12d3-a456-426614174000",
  user_id: "user-123",
  started_at: "2025-09-13T09:00:00Z",
  ended_at: "2025-09-13T11:00:00Z",
  config_name: "study_default",
  web_policy: { allow: ["wikipedia.org"], deny: ["youtube.com"], wildcard: true },
  app_policy: { allow: ["code.exe"], deny: ["tiktok.exe"] },
  vision_policy: { require_presence: true, away_grace_sec: 5 },
  stats: {
    focus_pct: 0.78,
    away_secs: 420,
    violations: { web: 3, app: 1, affect: 2 }
  },
  schema_version: 1
};

export const mockApps = [
  {
    session_id: "123e4567-e89b-12d3-a456-426614174000",
    ts_open: "2025-09-13T09:10:00Z",
    ts_close: "2025-09-13T09:30:00Z",
    app_name: "chrome.exe",
    window_title: "Stack Overflow — Code",
    policy: { allowed: true, rule: "app_allow" },
    action_taken: "notified",
    notification: { sent: true, ts: "2025-09-13T09:31:00Z" },
    schema_version: 1
  },
  {
    session_id: "123e4567-e89b-12d3-a456-426614174000",
    ts_open: "2025-09-13T09:40:00Z",
    ts_close: "2025-09-13T09:50:00Z",
    app_name: "discord.exe",
    window_title: "Chatting with friends",
    policy: { allowed: false, rule: "app_deny" },
    action_taken: "blocked",
    notification: { sent: true, ts: "2025-09-13T09:50:00Z" },
    schema_version: 1
  }
];

export const mockWeb = [
  {
    session_id: "123e4567-e89b-12d3-a456-426614174000",
    ts_open: "2025-09-13T09:05:00Z",
    ts_close: "2025-09-13T09:15:00Z",
    domain: "instagram.com",
    url_hash: "sha256(...)",   // just placeholder
    policy: { allowed: false, rule: "web_deny" },
    action_taken: "blocked",
    notification: { sent: true, ts: "2025-09-13T09:16:00Z" },
    affect: { label: "distressed", confidence: 0.71 },
    schema_version: 1
  }
];

export const mockCameraEvents = [
  {
    session_id: "123e4567-e89b-12d3-a456-426614174000",
    ts: "2025-09-13T09:20:00Z",
    presence: { state: "present", confidence: 0.97 },
    posture: { indicator: "slouch", confidence: 0.66 },
    affect: { label: "happy", confidence: 0.88 },
    schema_version: 1
  }
];

export const mockInterventions = [
  {
    session_id: "123e4567-e89b-12d3-a456-426614174000",
    ts: "2025-09-13T09:25:00Z",
    nudge_type: "toast",
    trigger_reason: "web_deny",
    action_payload: { domain: "instagram.com", rule: "deny" },
    user_response: "clicked",
    follow_up_result: "success",
    latency_ms: 742,
    schema_version: 1
  }
];

export const mockConfigs = [
  {
    name: "essay_mode_1",
    json: {
      action: "write_essay",
      apps: { allow: ["notepad.exe"], deny: ["discord.exe"] },
      web: { allow: ["jstor.org"], deny: ["youtube.com"], wildcard: true },
      vision: { require_presence: true, away_grace_sec: 10 }
    },
    source: "llm",
    prompt: "I'm writing an essay, block distractions",
    created_ts: "2025-09-13T08:00:00Z",
    updated_ts: "2025-09-13T08:30:00Z",
    schema_version: 1
  }
];

export const mockPredictions = [
  {
    session_id: "123e4567-e89b-12d3-a456-426614174000",
    ts_generated: "2025-09-13T11:00:00Z",
    models: {
      focus_forecast: [0.82, 0.79, 0.68],
      optimal_schedule: { slots: ["9–11AM", "2–4PM"] },
      risk_flags: ["fatigue", "repetition"]
    },
    input_span: {
      start: "2025-09-13T09:00:00Z",
      end: "2025-09-13T11:00:00Z"
    },
    schema_version: 1
  }
];
