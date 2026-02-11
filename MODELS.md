# AEA Data Models — Canonical Reference

> Single source of truth for all MongoDB collection schemas.
> Every producer (engine, seeder, API) and consumer (dashboard, stats) must follow these contracts.

Database: `aea_local`

---

## 1. configs

Stores user-created session configurations (policies, settings).

**Producers:** `processing-engine/main.py` (create_config), dashboard UI (POST /api/configs)
**Consumers:** `processing-engine/main.py` (pick_config, create_session), all engines (via action_config), `api-server`, dashboard configs component

```json
{
  "name": "study_default",
  "json": {
    "action": "study",
    "apps": {
      "allow": ["word.exe", "onenote.exe"],
      "deny": ["discord.exe", "tiktok.exe"]
    },
    "web": {
      "allow": ["khanacademy.org", "wikipedia.org"],
      "deny": ["youtube.com", "facebook.com", "twitter.com"],
      "wildcard": true
    },
    "emotion": {
      "allow": ["happy", "calm"],
      "deny": ["angry", "fear", "sad", "missing"]
    },
    "vision": {
      "require_presence": true,
      "away_grace_sec": 5
    },
    "session_time_limit": 3600,
    "enforcement_level": "strict",
    "camera_displayed": true
  },
  "source": "preset",
  "prompt": null,
  "created_ts": "<datetime>",
  "updated_ts": "<datetime>",
  "schema_version": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Unique config name |
| `json.action` | string | yes | `"study"` or `"write_essay"` |
| `json.apps.allow` | string[] | yes | Allowed process names (e.g. `"word.exe"`) |
| `json.apps.deny` | string[] | yes | Banned process names |
| `json.web.allow` | string[] | yes | Allowed domains |
| `json.web.deny` | string[] | yes | Banned domains |
| `json.web.wildcard` | bool | yes | `true` = unlisted sites allowed, `false` = only allow-list |
| `json.emotion.allow` | string[] | yes | Allowed emotion labels |
| `json.emotion.deny` | string[] | yes | Banned emotion labels |
| `json.vision.require_presence` | bool | yes | Must user be visible on camera |
| `json.vision.away_grace_sec` | number | yes | Seconds absent before violation |
| `json.session_time_limit` | number | yes | Max session duration (seconds) |
| `json.enforcement_level` | string | yes | `"strict"` or `"lenient"` |
| `json.camera_displayed` | bool | yes | Show camera preview window |
| `source` | string | yes | `"preset"` (manual) or `"llm"` (AI-generated) |
| `prompt` | string\|null | no | Original user prompt if source is `"llm"` |
| `created_ts` | datetime | yes | Creation timestamp |
| `updated_ts` | datetime | yes | Last modified timestamp |
| `schema_version` | number | yes | `2` |

**Valid emotion labels:** `happy`, `calm`, `neutral`, `angry`, `disgust`, `fear`, `sad`, `missing` (no face detected)

---

## 2. sessions

One document per monitoring session. Stats are null while running, populated on session end.

**Producers:** `processing-engine/main.py` (create_session, finalize_session)
**Consumers:** `api-server`, dashboard sessionOverview, `main.py` (compute_session_stats)

```json
{
  "session_id": "<uuid>",
  "user_id": "user-001",
  "started_at": "<datetime>",
  "ended_at": "<datetime> | null",
  "config_name": "study_default",
  "web_policy": {
    "allow": ["wikipedia.org"],
    "deny": ["youtube.com"],
    "wildcard": true
  },
  "app_policy": {
    "allow": ["code.exe"],
    "deny": ["tiktok.exe"]
  },
  "vision_policy": {
    "require_presence": true,
    "away_grace_sec": 5
  },
  "stats": {
    "focus_pct": 0.84,
    "away_secs": 390,
    "violations": { "web": 2, "app": 1, "affect": 2 }
  },
  "schema_version": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | yes | UUID v4 |
| `user_id` | string | yes | User identifier |
| `started_at` | datetime | yes | Session start time |
| `ended_at` | datetime\|null | yes | Null while running, set on stop |
| `config_name` | string | yes | Name of the config used |
| `web_policy.allow` | string[] | yes | Copied from config `json.web.allow` |
| `web_policy.deny` | string[] | yes | Copied from config `json.web.deny` |
| `web_policy.wildcard` | bool | yes | Copied from config `json.web.wildcard` |
| `app_policy.allow` | string[] | yes | Copied from config `json.apps.allow` |
| `app_policy.deny` | string[] | yes | Copied from config `json.apps.deny` |
| `vision_policy.require_presence` | bool | yes | Copied from config `json.vision.require_presence` |
| `vision_policy.away_grace_sec` | number | yes | Copied from config `json.vision.away_grace_sec` |
| `stats` | object\|null | yes | Null until session ends |
| `stats.focus_pct` | number | — | 0.0–1.0, estimated focus percentage |
| `stats.away_secs` | number | — | Total seconds user was absent |
| `stats.violations.web` | number | — | Count of web policy violations |
| `stats.violations.app` | number | — | Count of app policy violations |
| `stats.violations.affect` | number | — | Count of emotion violations |
| `schema_version` | number | yes | `1` |

---

## 3. app_events

One document per foreground app span. Written when the user switches away from an app.

**Producers:** `processing-engine/Engines/app_engine.py` (_flush_current_app)
**Consumers:** `api-server`, dashboard appsTable, `main.py` (compute_session_stats queries `policy.allowed: false`)

```json
{
  "session_id": "<uuid>",
  "ts_open": "<datetime>",
  "ts_close": "<datetime>",
  "app_name": "discord.exe",
  "window_title": "Discord - Chat",
  "policy": { "allowed": false, "rule": "app_deny" },
  "action_taken": "notified",
  "notification": { "sent": true, "ts": "<datetime>" },
  "schema_version": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | yes | UUID of the session |
| `ts_open` | datetime | yes | When user switched TO this app |
| `ts_close` | datetime | yes | When user switched AWAY from this app |
| `app_name` | string | yes | Process name (e.g. `"discord.exe"`) |
| `window_title` | string | yes | Window title at time of capture |
| `policy.allowed` | bool | yes | Whether the app is allowed by config |
| `policy.rule` | string | yes | `"app_allow"`, `"app_deny"`, or `"app_unlisted"` |
| `action_taken` | string | yes | `"ignored"` (allowed) or `"notified"` (violation) |
| `notification.sent` | bool | yes | Whether a notification was triggered |
| `notification.ts` | datetime\|null | no | Notification timestamp if sent |
| `schema_version` | number | yes | `1` |

---

## 4. website_events

One document per website visit span. Written when user navigates away or site changes.

**Producers:** `processing-engine/Engines/website_engine.py`
**Consumers:** `api-server`, dashboard webTable, `main.py` (compute_session_stats queries `policy.allowed: false`)

```json
{
  "session_id": "<uuid>",
  "ts_open": "<datetime>",
  "ts_close": "<datetime>",
  "domain": "youtube.com",
  "window_title": "YouTube - Chrome",
  "policy": { "allowed": false, "rule": "web_deny" },
  "action_taken": "notified",
  "notification": { "sent": true, "ts": "<datetime>" },
  "schema_version": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | yes | UUID of the session |
| `ts_open` | datetime | yes | When user navigated to this site |
| `ts_close` | datetime | yes | When user navigated away |
| `domain` | string | yes | Domain name (e.g. `"youtube.com"`) |
| `window_title` | string | yes | Browser window title at capture |
| `policy.allowed` | bool | yes | Whether the site is allowed by config |
| `policy.rule` | string | yes | `"web_allow"`, `"web_deny"`, or `"web_unlisted"` |
| `action_taken` | string | yes | `"ignored"` (allowed) or `"notified"` (violation) |
| `notification.sent` | bool | yes | Whether a notification was triggered |
| `notification.ts` | datetime\|null | no | Notification timestamp if sent |
| `schema_version` | number | yes | `2` |

> **Note:** The current `website_engine.py` writes a different shape (`{ ts, source, event_type, banned_site }`).
> It needs to be refactored to match this contract — same pattern as `app_engine.py` with ts_open/ts_close transition tracking.

---

## 5. camera_events

One document per camera violation event. Only written when a banned emotion is detected.

**Producers:** `processing-engine/Engines/facial_engine.py` (onViolation)
**Consumers:** `api-server`, dashboard cameraEvents, `main.py` (compute_session_stats)

```json
{
  "session_id": "<uuid>",
  "ts": "<datetime>",
  "presence": { "state": "present", "confidence": 0.97 },
  "posture": { "indicator": "upright", "confidence": 0.88 },
  "affect": { "label": "angry", "confidence": 0.76 },
  "schema_version": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | yes | UUID of the session |
| `ts` | datetime | yes | When the event was recorded |
| `presence.state` | string | yes | `"present"`, `"away"`, or `""` (not implemented) |
| `presence.confidence` | number\|string | yes | 0.0–1.0 or `""` (not implemented) |
| `posture.indicator` | string | yes | `"upright"`, `"slouch"`, or `""` (not implemented) |
| `posture.confidence` | number\|string | yes | 0.0–1.0 or `""` (not implemented) |
| `affect.label` | string | yes | Emotion label (e.g. `"angry"`, `"missing"`) |
| `affect.confidence` | number | yes | 0.0–1.0 confidence score |
| `schema_version` | number | yes | `1` |

> **Known limitation:** `facial_engine.py` currently only populates `affect`. The `presence` and `posture` fields are written as empty strings. Full implementation is a future task.

---

## 6. interventions

Records of nudges/notifications sent to the user during a session.

**Producers:** Not yet implemented in any engine (seed data only)
**Consumers:** `api-server`, dashboard interventions component

```json
{
  "session_id": "<uuid>",
  "ts": "<datetime>",
  "nudge_type": "toast",
  "trigger_reason": "web_deny",
  "action_payload": { "domain": "instagram.com", "rule": "deny" },
  "user_response": "clicked",
  "follow_up_result": "success",
  "latency_ms": 850,
  "schema_version": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | yes | UUID of the session |
| `ts` | datetime | yes | When the intervention was triggered |
| `nudge_type` | string | yes | `"toast"` or `"banner"` |
| `trigger_reason` | string | yes | `"web_deny"`, `"app_deny"`, or `"affect_threshold"` |
| `action_payload` | object | yes | Context about the trigger (varies by reason) |
| `user_response` | string | yes | `"clicked"`, `"ignored"`, or `"dismissed"` |
| `follow_up_result` | string | yes | `"success"` or `"snoozed"` |
| `latency_ms` | number | yes | Time in ms from trigger to user response |
| `schema_version` | number | yes | `1` |

---

## 7. predictions

AI-generated predictions and recommendations for a session.

**Producers:** Not yet implemented (seed data only, future LLM integration)
**Consumers:** `api-server`, dashboard predictions component

```json
{
  "session_id": "<uuid>",
  "ts_generated": "<datetime>",
  "models": {
    "focus_forecast": [0.89, 0.83, 0.77],
    "optimal_schedule": { "slots": ["10:00-12:00", "14:00-16:00"] },
    "risk_flags": ["slouching", "web_drift"]
  },
  "input_span": {
    "start": "<datetime>",
    "end": "<datetime>"
  },
  "schema_version": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | yes | UUID of the session |
| `ts_generated` | datetime | yes | When the prediction was computed |
| `models.focus_forecast` | number[] | yes | Predicted focus scores for upcoming intervals |
| `models.optimal_schedule.slots` | string[] | yes | Recommended productive time slots |
| `models.risk_flags` | string[] | yes | Detected risk factors |
| `input_span.start` | datetime | yes | Start of the data window used for prediction |
| `input_span.end` | datetime | yes | End of the data window |
| `schema_version` | number | yes | `1` |

---

## Schema Alignment Status

| Collection | Engine | Seeder | Dashboard | Aligned? |
|------------|--------|--------|-----------|----------|
| configs | needs update (flat→nested) | needs update (add emotion) | needs update (add emotion) | no |
| sessions | matches | matches | matches | yes |
| app_events | matches | matches | matches | yes |
| website_events | **different shape** | matches contract | matches contract | no |
| camera_events | partial (empty presence/posture) | matches | matches | partial |
| interventions | not implemented | matches | matches | n/a |
| predictions | not implemented | matches | matches | n/a |
