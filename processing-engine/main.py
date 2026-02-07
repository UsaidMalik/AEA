from Engines.facial_engine import FacialEngine
from Engines.website_engine import WebsiteEngine
import json
import uuid

def main():
    config_paths = {
        # absolute directory paths since it is running from main
        "study": "configs/study_config.json",
        "write_essay": "configs/writeessay_config.json",

    }

    print("Welcome to AEA - the AI Accountable Executive Assistant That keeps you organized!")
    user_action = input("what would you like to do today? (write_essay, study): ").strip().lower()
    session_id = uuid.uuid4() # the session id (correlation id) passed to teh different services
    # hard coded for now later this should be handled by AI
    while user_action not in config_paths:
        print(f"Sorry, I don't recognize the action '{user_action}'. Please choose from {list(config_paths.keys())}.")
        user_action = input("what would you like to do today? (write_essay, study): ").strip().lower()


    with open(config_paths[user_action], "r") as f:
        action_config = json.load(f)

    print(f"Great! You've chosen to '{user_action}'. Initializing the {user_action} engine...")

    # the facial engine will always take a config that tells it what to do
    print("action config is", action_config)
    facial_engine = FacialEngine(action_config=action_config, session_id=session_id, camera_index=0, safety_buffer_seconds=10)
    website_engine = WebsiteEngine(action_config=action_config, session_id=session_id)

    facial_engine.start_detection() # this is threaded
    website_engine.start_detection() # this is threaded

    # keep main thread alive until Ctrl+C
    try:
        while website_engine.is_running:
            website_engine.detection_thread.join(timeout=1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        facial_engine.stop_detection()
        website_engine.stop_detection()
    print("Session ended.")

if __name__ == "__main__":
    main()
