import json
import uuid
import os
import glob
import threading
import logging
import queue
from Engines.Camera.camera_engine import CameraEngine
from Engines.Processing.gradio_chatbot import Chatbot, launch_gradio_ui

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def launch_gradio_thread(chatbot_instance, q):
    """
    Function to run the Gradio UI in a separate thread.
    """
    launch_gradio_ui(chatbot_instance, q)

def main():
    # --- FEATURE FLAG ---
    # Set to True to use the Gradio UI to generate a new config.
    # Set to False to use a hardcoded config from the command line.
    USE_GRADIO_UI = True

    session_id = uuid.uuid4()
    
    if USE_GRADIO_UI:
        logger.info("Welcome to AEA - the AI Accountable Executive Assistant That keeps you organized!")
        logger.info("Please describe your study session in the pop-up window to generate a new configuration.")
        
        chat_engine = Chatbot()
        
        # Create a queue for inter-thread communication
        config_queue = queue.Queue()
        
        # Launch the Gradio UI in a separate thread, passing the queue
        gradio_thread = threading.Thread(target=launch_gradio_thread, args=(chat_engine, config_queue))
        gradio_thread.daemon = True  # Allows the thread to exit with the main program
        gradio_thread.start()
        
        logger.info("Gradio UI running in a new window...")
        logger.info("Waiting for configuration file to be saved...")
        
        # Wait for the Gradio thread to put the file path into the queue
        # This is a blocking call and is much more efficient than polling
        latest_config_path = config_queue.get()
        
        logger.info(f"Configuration file found at: {latest_config_path}")
        
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
        
        logger.info("Welcome to AEA - the AI Accountable Executive Assistant That keeps you organized!")
        user_action = input("What would you like to do today? (write_essay, study): ").strip().lower()

        while user_action not in config_paths:
            logger.warning(f"Sorry, I don't recognize the action '{user_action}'. Please choose from {list(config_paths.keys())}.")
            user_action = input("What would you like to do today? (write_essay, study): ").strip().lower()

        # Get the absolute path to the configs directory
        configs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "configs")
        config_file_path = os.path.join(os.path.abspath(configs_dir), os.path.basename(config_paths[user_action]))
        
        with open(config_file_path, "r") as f:
            action_config = json.load(f)

    # --- Start the Camera Engine with the selected configuration ---
    logger.info(f"Great! You've chosen to '{user_action}'. Initializing the {user_action} engine...")
    logger.debug("action config is %s", action_config)
    facial_engine = CameraEngine(action_config=action_config, session_id=session_id, camera_index=0, safety_buffer_seconds=10)
    facial_engine.start_detection() # this is threaded

if __name__ == "__main__":
    main()