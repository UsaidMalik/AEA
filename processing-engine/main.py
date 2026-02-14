from Engines.facial_engine import FacialEngine
from Engines.website_engine import WebsiteEngine
from Engines.app_engine import AppEngine
from DBWriter.DBWriter import DBWriter
import uuid
import datetime


class SessionManager:
    def __init__(self):
        self.db_writer = DBWriter()
        self.session_id = None
        self.config = None
        self.started_at = None
        self.running = False
        self.facial_engine = None
        self.website_engine = None
        self.app_engine = None

    def start_session(self, config_name):
        """Look up config by name, create a session, start all engines."""
        if self.running:
            return {"error": "A session is already running."}

        self.config = self.db_writer.find_one("configs", {"name": config_name})
        if self.config is None:
            return {"error": f"Config '{config_name}' not found."}

        action_config = self.config.get("json", {})
        self.session_id = uuid.uuid4()

        print(f"\nStarting session {self.session_id} with config '{self.config['name']}'...")
        self.started_at = self.create_session()

        # Create engines
        camera_displayed = action_config.get("camera_displayed", True)
        self.facial_engine = FacialEngine(
            action_config=action_config,
            session_id=self.session_id,
            camera_index=0,
            safety_buffer_seconds=10,
            show_face_window=camera_displayed
        )
        self.website_engine = WebsiteEngine(
            action_config=action_config,
            session_id=self.session_id
        )
        self.app_engine = AppEngine(
            action_config=action_config,
            session_id=self.session_id
        )

        # Start all engines (threaded)
        self.facial_engine.start_detection()
        self.website_engine.start_detection()
        self.app_engine.start_detection()
        self.running = True

        print("All engines running.\n")
        return {"session_id": str(self.session_id), "config_name": self.config["name"]}

    def stop_session(self):
        """Stop all engines and finalize session stats."""
        if not self.running:
            return {"error": "No session is currently running."}

        self.facial_engine.stop_detection()
        self.website_engine.stop_detection()
        self.app_engine.stop_detection()

        stats, ended_at = self.finalize_session()

        self.running = False
        self.session_id = None
        self.config = None
        self.started_at = None

        print("Session ended.")
        return {"stats": stats, "ended_at": str(ended_at)}

    def status(self):
        """Return current session state."""
        return {
            "running": self.running,
            "session_id": str(self.session_id) if self.session_id else None,
            "config_name": self.config.get("name") if self.config else None,
            "started_at": str(self.started_at) if self.started_at else None,
        }

    def create_session(self):
        """Insert the initial session document into MongoDB."""
        cfg_json = self.config.get("json", {})
        now = datetime.datetime.utcnow()

        session_doc = {
            "session_id": str(self.session_id),
            "user_id": "user-001",
            "started_at": now,
            "ended_at": None,
            "config_name": self.config.get("name", "unknown"),
            "web_policy": {
                "allow": cfg_json.get("web", {}).get("allow", []),
                "deny": cfg_json.get("web", {}).get("deny", []),
                "wildcard": cfg_json.get("web", {}).get("wildcard", True),
            },
            "app_policy": {
                "allow": cfg_json.get("apps", {}).get("allow", []),
                "deny": cfg_json.get("apps", {}).get("deny", []),
            },
            "vision_policy": {
                "require_presence": cfg_json.get("vision", {}).get("require_presence", True),
                "away_grace_sec": cfg_json.get("vision", {}).get("away_grace_sec", 5),
            },
            "stats": None,
            "schema_version": 1,
        }

        self.db_writer.write_entry("sessions", session_doc)
        return now

    def compute_session_stats(self, ended_at):
        """Query MongoDB for events and compute session summary stats."""
        sid = str(self.session_id)

        web_violations = self.db_writer.count_entries("website_events", {
            "session_id": sid,
            "policy.allowed": False,
        })
        app_violations = self.db_writer.count_entries("app_events", {
            "session_id": sid,
            "policy.allowed": False,
        })
        affect_violations = self.db_writer.count_entries("camera_events", {
            "session_id": sid,
        })
        missing_events = self.db_writer.count_entries("camera_events", {
            "session_id": sid,
            "affect.label": "missing",
        })

        away_secs = missing_events * 10
        total_secs = (ended_at - self.started_at).total_seconds()
        focus_pct = max(0.0, min(1.0, 1.0 - (away_secs / total_secs))) if total_secs > 0 else 1.0

        return {
            "focus_pct": round(focus_pct, 2),
            "away_secs": int(away_secs),
            "violations": {
                "web": web_violations,
                "app": app_violations,
                "affect": affect_violations,
            },
        }

    def finalize_session(self):
        """Compute stats, set ended_at, and update the session document."""
        ended_at = datetime.datetime.utcnow()
        stats = self.compute_session_stats(ended_at)

        self.db_writer.update_entry(
            collection="sessions",
            query={"session_id": str(self.session_id)},
            update={"$set": {"ended_at": ended_at, "stats": stats}},
        )

        return stats, ended_at


def main():
    """CLI entry point — still works for manual testing."""
    print("Welcome to AEA - the AI Accountable Executive Assistant!")

    manager = SessionManager()

    while True:
        print("\n1) Start a session")
        print("2) Stop current session")
        print("3) Session status")
        print("4) Exit")
        choice = input("Choose: ").strip()

        if choice == "1":
            name = input("Config name: ").strip()
            result = manager.start_session(name)
            print(result)
        elif choice == "2":
            result = manager.stop_session()
            print(result)
        elif choice == "3":
            print(manager.status())
        elif choice == "4":
            if manager.running:
                manager.stop_session()
            print("Goodbye!")
            break
        else:
            print("Invalid choice, try again.")


if __name__ == "__main__":
    main()
