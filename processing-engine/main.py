from Engines.facial_engine import FacialEngine
import json

def main():
    config_paths = {
        "study": "../configs/study_config.json",
        "write_essay": "../configs/write_essay_config.json",

    }

    print("Welcome to AEA - the AI Accountable Executive Assistant That keeps you organized!")
    user_action = input("what would you like to do today? (write_essay, study): ")

    # hard coded for now later this should be handled by AI 
    while user_action not in action_config:
        print(f"Sorry, I don't recognize the action '{user_action}'. Please choose from {list(action_config.keys())}.")
        user_action = input("what would you like to do today? (write_essay, study): ")
    
    with open(config_paths[user_action], "r") as f:
        action_config = json.load(f)    

    print(f"Great! You've chosen to '{user_action}'. Initializing the {user_action} engine...")
    
    # the facial engine will always take a config that tells it what to do
    engine = FacialEngine(action_config=action_config)
    engine.start_detection()
    engine.stop_detection()

if __name__ == "__main__":
    main()