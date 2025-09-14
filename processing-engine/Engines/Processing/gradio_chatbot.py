import gradio as gr
import requests
import yaml
import json
import os
import glob
import threading
import logging
import queue
from datetime import datetime

# Get a logger for this module
logger = logging.getLogger(__name__)

class Chatbot:
    """
    A class to handle interactions with the language model for generating
    study session configurations via API calls.
    """
    def __init__(self):
        # We assume the config.yaml file exists in the same directory as this script.
        # This will be adjusted in the main.py to handle file paths correctly.
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.yaml")
        if not os.path.exists(config_path):
            # Fallback to current working directory if not found
            config_path = os.path.join(os.getcwd(), "config.yaml")
            if not os.path.exists(config_path):
                raise FileNotFoundError(f"config.yaml not found at {config_path}")

        with open(config_path, "r") as file:
            config = yaml.safe_load(file)

        self.api_key = config["api_key"]
        self.base_url = config["model_server_base_url"]
        self.stream = config["stream"]
        self.stream_timeout = config["stream_timeout"]
        self.workspace_slug = config["workspace_slug"]

        if self.stream:
            self.chat_url = f"{self.base_url}/workspace/{self.workspace_slug}/stream-chat"
        else:
            self.chat_url = f"{self.base_url}/workspace/{self.workspace_slug}/chat"

        self.headers = {
            "accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + self.api_key
        }

    def generate_study_config(self, user_description: str) -> str:
        """
        Generates a study session configuration based on a user's description
        by sending a request to the language model API.

        Args:
            user_description (str): The user's description of their study session.

        Returns:
            str: The generated JSON configuration as a string, or None if generation fails.
        """
        prompt = f"""Based on the following study session description, create a JSON configuration file with the exact same structure as this example:

Example JSON structure:
{{
    "banned_emotions": ["anger", "fear"],
    "allowed_emotions": ["neutral", "happy"],
    "banned_websites": ["reddit.com", "discord.com"],
    "allowed_websites": ["researchgate.net", "scholar.google.com"],
    "banned_apps": [],
    "allowed_apps": ["word.exe"],
    "session_time_limit": 5400,
    "enforcement_level": "lenient",
    "notification_preferences": "log_only",
    "activity_log_enable": true,
    "custom_triggers": [],
    "action": "write essay"
}}

User's study session description: {user_description}

Please generate a JSON configuration that matches this structure exactly. Use appropriate values based on the user's description. The JSON should be valid and contain all the required keys. Only return the JSON, no additional text."""

        data = {
            "message": prompt,
            "mode": "chat",
            "sessionId": "config-generation-session",
            "attachments": []
        }
        
        try:
            # Add a timeout to the request to prevent it from hanging indefinitely
            chat_response = requests.post(
                self.chat_url,
                headers=self.headers,
                json=data,
                timeout=self.stream_timeout
            )
            # Raise an HTTPError for bad responses (4xx or 5xx)
            chat_response.raise_for_status()

            response_json = chat_response.json()
            response_text = response_json.get('textResponse')

            if response_text is None:
                logger.error(f"API response did not contain 'textResponse' key. Full response: {response_json}")
                return None
            
            # Try to extract JSON from the response
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                # Validate JSON
                json.loads(json_str)
                return json_str
            else:
                return None
            
        except (ValueError, json.JSONDecodeError) as e:
            logger.error(f"Failed to decode JSON from response: {e}")
            return None
        except requests.exceptions.Timeout:
            logger.warning(f"Request timed out after {self.stream_timeout} seconds.")
            return None
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error occurred during API call: {e}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred during API call: {e}")
            return None

    def save_config_to_file(self, json_config: str) -> str:
        """
        Saves the generated JSON configuration to a file in the configs directory.
        Adds "sadness", "contempt", and "disgust" to the banned_emotions list.

        Args:
            json_config (str): The JSON configuration string to save.

        Returns:
            str: The filepath of the saved configuration, or None if saving fails.
        """
        try:
            # Get the path to the configs directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            configs_dir = os.path.join(current_dir, "..", "..", "configs")
            configs_dir = os.path.abspath(configs_dir)
            
            # Create configs directory if it doesn't exist
            os.makedirs(configs_dir, exist_ok=True)

            # Load the JSON config to modify it
            config_data = json.loads(json_config)
            
            # Define the emotions to always be banned
            emotions_to_add = ["missing"]
            
            # Get the current banned emotions and add the new ones, avoiding duplicates
            banned_emotions = config_data.get("banned_emotions", [])
            for emotion in emotions_to_add:
                if emotion not in banned_emotions:
                    banned_emotions.append(emotion)
            
            # Update the dictionary with the new list
            config_data["banned_emotions"] = banned_emotions
            
            # Convert the updated dictionary back to a JSON string
            updated_json_config = json.dumps(config_data, indent=4)
            
            # Generate filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"study_config_{timestamp}.json"
            filepath = os.path.join(configs_dir, filename)
            
            # Save the updated JSON to configs directory
            with open(filepath, 'w') as f:
                f.write(updated_json_config)
            
            return filepath
        except Exception as e:
            logger.error(f"Failed to save configuration to file: {e}")
            return None

def launch_gradio_ui(chatbot_instance, q):
    """
    Launches the Gradio UI for configuration generation.

    Args:
        chatbot_instance (Chatbot): An instance of the Chatbot class.
        q (queue.Queue): The queue to put the filename on.
    """
    with gr.Blocks() as app:
        gr.Markdown("# Study Session Configuration Generator")
        chatbot_widget = gr.Chatbot(type="messages", value=[{"role": "assistant", "content": "Please describe your study session"}])
        msg = gr.Textbox(placeholder="Describe your study session...")
        submit_btn = gr.Button("Generate Configuration")

        def process_study_description(message, history):
            if not message.strip():
                return history, ""
            
            # Add user message to history
            history.append({"role": "user", "content": message})
            
            # Generate configuration
            json_config = chatbot_instance.generate_study_config(message)
            
            if json_config:
                # Save to file
                filename = chatbot_instance.save_config_to_file(json_config)
                if filename:
                    # Put the filename on the queue and tell the user what to do
                    q.put(filename)
                    history.append({"role": "assistant", "content": f"Thank you for the information. Your configuration has been saved successfully at: {filename}\nYou can now close this window."})
                else:
                    history.append({"role": "assistant", "content": "Thank you for the information. Configuration generated but failed to save to file."})
            else:
                history.append({"role": "assistant", "content": "Thank you for the information. I was unable to generate a valid configuration from your description."})
            
            return history, ""

        # Handle form submission
        def handle_submit(message, history):
            new_history, cleared_msg = process_study_description(message, history)
            return new_history, cleared_msg

        # Connect the submit button and textbox
        submit_btn.click(
            handle_submit,
            inputs=[msg, chatbot_widget],
            outputs=[chatbot_widget, msg]
        )
        
        msg.submit(
            handle_submit,
            inputs=[msg, chatbot_widget],
            outputs=[chatbot_widget, msg]
        )

    app.launch()