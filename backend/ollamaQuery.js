// backend/ollamaQuery.js
import fetch from "node-fetch";

export async function queryOllama(userQuestion) {
  const systemPrompt = `
You are an assistant that converts user questions into MongoDB queries.

Mongo collections and fields:
1. web: { session_id, domain, url_hash, affect.label, ts_open, ts_close }
2. apps: { session_id, app_name, window_title, policy.allowed, ts_open, ts_close }
3. camera_events: { session_id, presence.state, posture.indicator, affect.label, ts }
4. interventions: { session_id, ts, trigger_reason, action_payload.domain }

Respond ONLY with a valid JSON object like:
{
  "collection": "web",
  "filter": {
    "domain": { "$regex": "instagram", "$options": "i" },
    "affect.label": "happy"
  },
  "projection": {
    "domain": 1,
    "ts_open": 1,
    "ts_close": 1,
    "affect": 1
  }
}
`;

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    body: JSON.stringify({
      model: "mistral",
      prompt: `${systemPrompt}\n\nUser Question: ${userQuestion}`,
      stream: false
    }),
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await response.json();
  return data.response;
}
