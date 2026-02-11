from Engines.facial_engine import FacialEngine
from Engines.website_engine import WebsiteEngine
from Engines.app_engine import AppEngine
from DBWriter.DBWriter import DBWriter
import uuid
import datetime


def create_config(db_writer):
    """Prompt user for preferences and save a config to MongoDB."""
    print("\n--- Create a New Config ---\n")

    name = input("Config name (e.g. study_default): ").strip()
    action = input("Action type (study / write_essay): ").strip().lower()

    print("\n--- Websites ---")
    banned_websites = [s.strip() for s in input("Banned websites (comma-separated): ").split(",") if s.strip()]
    allowed_websites = [s.strip() for s in input("Allowed websites (comma-separated): ").split(",") if s.strip()]

    print("\n--- Apps ---")
    banned_apps = [s.strip() for s in input("Banned apps (comma-separated, e.g. discord.exe): ").split(",") if s.strip()]
    allowed_apps = [s.strip() for s in input("Allowed apps (comma-separated, e.g. word.exe): ").split(",") if s.strip()]

    print("\n--- Emotions ---")
    banned_emotions = [s.strip() for s in input("Banned emotions (comma-separated, e.g. angry,fear,sad): ").split(",") if s.strip()]
    allowed_emotions = [s.strip() for s in input("Allowed emotions (comma-separated, e.g. happy,neutral): ").split(",") if s.strip()]

    print("\n--- Settings ---")
    time_limit_str = input("Session time limit in seconds [3600]: ").strip()
    session_time_limit = int(time_limit_str) if time_limit_str else 3600

    enforcement = input("Enforcement level (strict / lenient) [strict]: ").strip().lower()
    if enforcement not in ("strict", "lenient"):
        enforcement = "strict"

    camera_input = input("Show camera feed? (yes / no) [yes]: ").strip().lower()
    camera_displayed = camera_input != "no"

    grace_str = input("Away grace period in seconds [5]: ").strip()
    away_grace_sec = int(grace_str) if grace_str else 5

    now = datetime.datetime.utcnow()

    config_doc = {
        "name": name,
        "json": {
            "action": action,
            "apps": {
                "allow": allowed_apps,
                "deny": banned_apps
            },
            "web": {
                "allow": allowed_websites,
                "deny": banned_websites,
                "wildcard": True
            },
            "emotion": {
                "allow": allowed_emotions,
                "deny": banned_emotions
            },
            "vision": {
                "require_presence": True,
                "away_grace_sec": away_grace_sec
            },
            "session_time_limit": session_time_limit,
            "enforcement_level": enforcement,
            "camera_displayed": camera_displayed,
        },
        "source": "preset",
        "prompt": None,
        "created_ts": now,
        "updated_ts": now,
        "schema_version": 2
    }

    db_writer.write_entry("configs", config_doc)
    print(f"\nConfig '{name}' saved!\n")


def pick_config(db_writer):
    """Show available configs from MongoDB and let user pick one.
    Returns the chosen config document or None.
    """
    configs = db_writer.find_entries("configs", {})
    if not configs:
        print("No configs found. Please create one first.")
        return None

    print("\n--- Available Configs ---")
    for i, cfg in enumerate(configs, 1):
        action = cfg.get("json", {}).get("action", "unknown")
        print(f"  {i}) {cfg['name']}  ({action})")

    choice = input(f"Pick a config (1-{len(configs)}): ").strip()
    try:
        idx = int(choice) - 1
        if 0 <= idx < len(configs):
            return configs[idx]
    except ValueError:
        pass

    print("Invalid choice.")
    return None


def create_session(db_writer, session_id, config):
    """Insert the initial session document into MongoDB."""
    cfg_json = config.get("json", {})
    now = datetime.datetime.utcnow()

    session_doc = {
        "session_id": str(session_id),
        "user_id": "user-001",
        "started_at": now,
        "ended_at": None,
        "config_name": config.get("name", "unknown"),
        "web_policy": {
            "allow": cfg_json.get("web", {}).get("allow", []),
            "deny": cfg_json.get("web", {}).get("deny", []),
            "wildcard": cfg_json.get("web", {}).get("wildcard", True)
        },
        "app_policy": {
            "allow": cfg_json.get("apps", {}).get("allow", []),
            "deny": cfg_json.get("apps", {}).get("deny", [])
        },
        "vision_policy": {
            "require_presence": cfg_json.get("vision", {}).get("require_presence", True),
            "away_grace_sec": cfg_json.get("vision", {}).get("away_grace_sec", 5)
        },
        "stats": None,
        "schema_version": 1
    }

    db_writer.write_entry("sessions", session_doc)
    return now


def compute_session_stats(db_writer, session_id, started_at, ended_at):
    """Query MongoDB for events and compute session summary stats."""
    sid = str(session_id)

    # Count web violations (website_engine writes policy.allowed: False for banned sites)
    web_violations = db_writer.count_entries("website_events", {
        "session_id": sid,
        "policy.allowed": False
    })

    # Count app violations (app_engine writes policy.allowed: False for banned apps)
    app_violations = db_writer.count_entries("app_events", {
        "session_id": sid,
        "policy.allowed": False
    })

    # Count affect violations (facial_engine only writes on violation)
    affect_violations = db_writer.count_entries("camera_events", {
        "session_id": sid
    })

    # Estimate away time from camera_events with affect.label "missing"
    missing_events = db_writer.count_entries("camera_events", {
        "session_id": sid,
        "affect.label": "missing"
    })
    # Each missing event ~= safety_buffer_seconds of absence
    away_secs = missing_events * 10

    total_secs = (ended_at - started_at).total_seconds()
    if total_secs > 0:
        focus_pct = max(0.0, min(1.0, 1.0 - (away_secs / total_secs)))
    else:
        focus_pct = 1.0

    return {
        "focus_pct": round(focus_pct, 2),
        "away_secs": int(away_secs),
        "violations": {
            "web": web_violations,
            "app": app_violations,
            "affect": affect_violations
        }
    }


def finalize_session(db_writer, session_id, started_at):
    """Compute stats, set ended_at, and update the session document."""
    ended_at = datetime.datetime.utcnow()
    stats = compute_session_stats(db_writer, session_id, started_at, ended_at)

    db_writer.update_entry(
        collection="sessions",
        query={"session_id": str(session_id)},
        update={"$set": {"ended_at": ended_at, "stats": stats}}
    )

    return stats, ended_at


def start_session(db_writer):
    """Pick a config, create a session, start all engines, run until Ctrl+C."""
    config = pick_config(db_writer)
    if config is None:
        return

    action_config = config.get("json", {})
    session_id = uuid.uuid4()

    print(f"\nStarting session {session_id} with config '{config['name']}'...")
    started_at = create_session(db_writer, session_id, config)

    # Create engines
    camera_displayed = action_config.get("camera_displayed", True)
    facial_engine = FacialEngine(
        action_config=action_config,
        session_id=session_id,
        camera_index=0,
        safety_buffer_seconds=10,
        show_face_window=camera_displayed
    )
    website_engine = WebsiteEngine(
        action_config=action_config,
        session_id=session_id
    )
    app_engine = AppEngine(
        action_config=action_config,
        session_id=session_id
    )

    # Start all engines (threaded)
    facial_engine.start_detection()
    website_engine.start_detection()
    app_engine.start_detection()

    print("All engines running. Press Ctrl+C to stop.\n")

    # Keep main thread alive
    try:
        while website_engine.is_running:
            website_engine.detection_thread.join(timeout=1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        facial_engine.stop_detection()
        website_engine.stop_detection()
        app_engine.stop_detection()

        stats, ended_at = finalize_session(db_writer, session_id, started_at)
        print(f"\nSession stats: {stats}")

    print("Session ended.")


def main():
    print("Welcome to AEA - the AI Accountable Executive Assistant!")

    db_writer = DBWriter()

    while True:
        print("\n1) Start a session")
        print("2) Create a new config")
        print("3) Exit")
        choice = input("Choose: ").strip()

        if choice == "1":
            start_session(db_writer)
        elif choice == "2":
            create_config(db_writer)
        elif choice == "3":
            print("Goodbye!")
            break
        else:
            print("Invalid choice, try again.")


if __name__ == "__main__":
    main()
