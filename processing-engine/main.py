import json
import uuid
import os
import glob
import threading
import time
from Engines.Camera.camera_engine import CameraEngine
from Engines.Processing.gradio_chatbot import Chatbot, launch_gradio_ui

def find_latest_config_file(directory: str) -> str:
    """
    Finds the path to the most recently created .json file in a directory.
    """
    try:
        list_of_files = glob.glob(os.path.join(directory, '*.json'))
        if not list_of_files:
            return None
        latest_file = max(list_of_files, key=os.path.getctime)
        return latest_file
    except Exception as e:
        print(f"Error finding latest config file: {e}")
        return None

def launch_gradio_thread(chatbot_instance):
    """
    Function to run the Gradio UI in a separate thread.
    """
    launch_gradio_ui(chatbot_instance)

def main():
    # --- FEATURE FLAG ---
    # Set to True to use the Gradio UI to generate a new config.
    # Set to False to use a hardcoded config from the command line.
    USE_GRADIO_UI = True

    session_id = uuid.uuid4()
    
    if USE_GRADIO_UI:
        print("Welcome to AEA - the AI Accountable Executive Assistant That keeps you organized!")
        print("Please describe your study session in the pop-up window to generate a new configuration.")
        
        chat_engine = Chatbot()
        
        # Launch the Gradio UI in a separate thread
        gradio_thread = threading.Thread(target=launch_gradio_thread, args=(chat_engine,))
        gradio_thread.daemon = True  # Allows the thread to exit with the main program
        gradio_thread.start()
        
        # Loop to wait for the configuration file to be created
        latest_config_path = None
        configs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "configs")
        configs_dir = os.path.abspath(configs_dir)
        
        print("Gradio UI running in a new window...")
        print("Waiting for configuration file to be saved...")
        
        # Poll for the file until it appears
        while not latest_config_path:
            latest_config_path = find_latest_config_file(configs_dir)
            time.sleep(1) # Check every second
        
        print(f"Configuration file found at: {latest_config_path}")
        
        # Load the configuration file
        with open(latest_config_path, "r") as f:
            action_config = json.load(f)

        user_action = action_config.get("action", "unknown_action")
    else:
        # Hardcoded for now, will be handled by the AI later.
        config_paths = {
            "study": "configs/study_config.json",
            "write_essay": "configs/write_essay_config.json",
        }
        
        print("Welcome to AEA - the AI Accountable Executive Assistant That keeps you organized!")
        user_action = input("What would you like to do today? (write_essay, study): ").strip().lower()

        while user_action not in config_paths:
            print(f"Sorry, I don't recognize the action '{user_action}'. Please choose from {list(config_paths.keys())}.")
            user_action = input("What would you like to do today? (write_essay, study): ").strip().lower()

        # Get the absolute path to the configs directory
        configs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "configs")
        config_file_path = os.path.join(os.path.abspath(configs_dir), os.path.basename(config_paths[user_action]))
        
        with open(config_file_path, "r") as f:
            action_config = json.load(f)

    # --- Start the Camera Engine with the selected configuration ---
    print(f"Great! You've chosen to '{user_action}'. Initializing the {user_action} engine...")
    print("action config is", action_config)
    facial_engine = CameraEngine(action_config=action_config, session_id=session_id, camera_index=0, safety_buffer_seconds=10)
    facial_engine.start_detection() # this is threaded

if __name__ == "__main__":
    main()
