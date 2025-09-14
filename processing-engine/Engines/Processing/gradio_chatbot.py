import gradio as gr
import requests
import yaml
import asyncio
import httpx
import json
import os
from datetime import datetime

class Chatbot:
    def __init__(self):
        with open("config.yaml", "r") as file:
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
        Generate a study session configuration based on user description.
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
            chat_response = requests.post(
                self.chat_url,
                headers=self.headers,
                json=data
            )
            response_text = chat_response.json()['textResponse']
            
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
            return None
        except Exception as e:
            return None

    def save_config_to_file(self, json_config: str) -> str:
        """
        Save the generated JSON configuration to a file in the configs directory.
        """
        try:
            # Get the path to the configs directory (two levels up from current script)
            current_dir = os.path.dirname(os.path.abspath(__file__))
            configs_dir = os.path.join(current_dir, "..", "..", "configs")
            configs_dir = os.path.abspath(configs_dir)
            
            # Create configs directory if it doesn't exist
            os.makedirs(configs_dir, exist_ok=True)
            
            # Generate filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"study_config_{timestamp}.json"
            filepath = os.path.join(configs_dir, filename)
            
            # Save to configs directory
            with open(filepath, 'w') as f:
                f.write(json_config)
            
            return filepath
        except Exception as e:
            return None

def main():
    chatbot = Chatbot()

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
            json_config = chatbot.generate_study_config(message)
            
            if json_config:
                # Save to file
                filename = chatbot.save_config_to_file(json_config)
                if filename:
                    history.append({"role": "assistant", "content": "Thank you for the information. Your study configuration has been saved successfully."})
                else:
                    history.append({"role": "assistant", "content": "Thank you for the information. Configuration generated but failed to save to file."})
            else:
                history.append({"role": "assistant", "content": "Thank you for the information. I was unable to generate a valid configuration from your description."})
            
            # Schedule app closure after a delay
            import threading
            import time
            import os
            import sys
            
            def close_after_delay():
                time.sleep(5)  # Wait 5 seconds for user to read the message
                app.close()
                os._exit(0)  # Forcefully terminate the entire process
            
            # Start the close timer in a separate thread
            close_thread = threading.Thread(target=close_after_delay)
            close_thread.daemon = True
            close_thread.start()
            
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


if __name__ == "__main__":
    main()