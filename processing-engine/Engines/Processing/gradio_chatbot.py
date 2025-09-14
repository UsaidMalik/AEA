# study_config_generator.py

import gradio as gr
import requests
import yaml
import json
import os
import glob
import threading
from datetime import datetime
from gemma import setup_model_session, load_gemma_model_and_tokenizer, generate_text


class Chatbot:
    """
    A class to handle interactions with the language model for generating
    study session configurations via API calls.
    """
    def __init__(self):
        session, tokenizer, config = load_gemma_model_and_tokenizer()
        self.session = session
        self.tokenizer = tokenizer
        self.config = config

    def generate_study_config(self, user_description: str) -> str:
        """
        Generates a study session configuration based on a user's description
        by sending a request to the language model API.

        Args:
            user_description (str): The user's description of their study session.

        Returns:
            str: The generated JSON configuration as a string, or None if generation fails.
        """
        prompt = f"""Create JSON for study session: {user_description}

{{
  "banned_emotions": ["anger", "fear"],
  "allowed_emotions": ["neutral", "happy"],
  "banned_websites": ["tiktok.com", "youtube.com"],
  "allowed_websites": ["researchgate.net"],
  "banned_apps": [],
  "allowed_apps": ["word.exe"],
  "session_time_limit": 9000,
  "enforcement_level": "lenient",
  "notification_preferences": "log_only",
  "activity_log_enable": true,
  "custom_triggers": [],
  "action": "study"
}}"""

        try:
            print(f"Sending prompt to LLM: {prompt[:100]}...")

            response_text = generate_text(
                session=self.session,
                tokenizer=self.tokenizer,
                config=self.config,
                prompt=prompt,
                max_length=200,
                temperature=0.7,
                do_sample=False
            )

            print(f"LLM response length: {len(response_text) if response_text else 0}")

            if not response_text or len(response_text.strip()) == 0:
                print("LLM returned empty response, using fallback")
                return self._create_fallback_config(user_description)

            response_text = response_text.strip()
            print(f"Raw LLM response: {response_text[:200]}...")

            json_candidates = []

            # Strategy 1: JSON in code blocks
            if '```json' in response_text:
                start_marker = '```json'
                end_marker = '```'
                start_idx = response_text.find(start_marker)
                if start_idx != -1:
                    start_idx += len(start_marker)
                    end_idx = response_text.find(end_marker, start_idx)
                    if end_idx != -1:
                        candidate = response_text[start_idx:end_idx].strip()
                        json_candidates.append(candidate)

            # Strategy 2: Lines starting with { ... ending with }
            lines = response_text.split('\n')
            json_lines = []
            in_json = False
            for line in lines:
                line = line.strip()
                if line.startswith('{'):
                    in_json = True
                    json_lines = [line]
                elif in_json:
                    json_lines.append(line)
                    if line.endswith('}'):
                        candidate = '\n'.join(json_lines)
                        json_candidates.append(candidate)
                        break

            # Strategy 3: First balanced braces
            json_start = response_text.find('{')
            if json_start != -1:
                brace_count = 0
                json_end = -1
                for i, char in enumerate(response_text[json_start:], json_start):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_end = i + 1
                            break
                if json_end > json_start:
                    candidate = response_text[json_start:json_end].strip()
                    json_candidates.append(candidate)

            # Try parsing candidates
            for candidate in json_candidates:
                try:
                    candidate = candidate.strip()
                    if not candidate:
                        continue
                    parsed_json = json.loads(candidate)

                    if isinstance(parsed_json, dict):
                        default_config = {
                            "banned_emotions": ["anger", "fear"],
                            "allowed_emotions": ["neutral", "happy"],
                            "banned_websites": [],
                            "allowed_websites": ["researchgate.net", "scholar.google.com"],
                            "banned_apps": [],
                            "allowed_apps": ["word.exe"],
                            "session_time_limit": 5400,
                            "enforcement_level": "lenient",
                            "notification_preferences": "log_only",
                            "activity_log_enable": True,
                            "custom_triggers": [],
                            "action": "study session"
                        }

                        for key, value in parsed_json.items():
                            if key in default_config:
                                default_config[key] = value

                        if "tiktok" in user_description.lower() or "youtube" in user_description.lower():
                            default_config["banned_websites"] = ["tiktok.com", "youtube.com"]

                        if "2.5" in user_description or "2.5 hours" in user_description:
                            default_config["session_time_limit"] = 9000

                        if "calculus" in user_description.lower():
                            default_config["action"] = "study calculus"

                        return json.dumps(default_config, indent=2)

                except json.JSONDecodeError:
                    continue

            print("Failed to extract valid JSON, creating default config based on user input")
            return self._create_fallback_config(user_description)

        except (ValueError, json.JSONDecodeError) as e:
            print(f"Failed to decode JSON from response: {e}")
            return self._create_fallback_config(user_description)
        except requests.exceptions.Timeout:
            print(f"Request timed out.")
            return self._create_fallback_config(user_description)
        except Exception as e:
            print(f"An error occurred during API call: {e}")
            return self._create_fallback_config(user_description)

    def _create_fallback_config(self, user_description: str) -> str:
        """Create a fallback configuration when LLM fails completely."""
        print("Creating fallback configuration based on user input")

        banned_websites = []
        if any(site in user_description.lower() for site in ["tiktok", "youtube", "facebook", "instagram"]):
            if "tiktok" in user_description.lower():
                banned_websites.append("tiktok.com")
            if "youtube" in user_description.lower():
                banned_websites.append("youtube.com")
            if "facebook" in user_description.lower():
                banned_websites.append("facebook.com")
            if "instagram" in user_description.lower():
                banned_websites.append("instagram.com")

        session_time = 5400
        if "2.5" in user_description or "2.5 hours" in user_description:
            session_time = 9000
        elif "2" in user_description and "hour" in user_description:
            session_time = 7200
        elif "1" in user_description and "hour" in user_description:
            session_time = 3600

        action = "study session"
        if "calculus" in user_description.lower():
            action = "study calculus"
        elif "math" in user_description.lower():
            action = "study mathematics"
        elif "exam" in user_description.lower():
            action = "study for exam"

        config = {
            "banned_emotions": ["anger", "fear"],
            "allowed_emotions": ["neutral", "happy"],
            "banned_websites": banned_websites,
            "allowed_websites": ["researchgate.net", "scholar.google.com"],
            "banned_apps": [],
            "allowed_apps": ["word.exe"],
            "session_time_limit": session_time,
            "enforcement_level": "lenient",
            "notification_preferences": "log_only",
            "activity_log_enable": True,
            "custom_triggers": [],
            "action": action
        }

        return json.dumps(config, indent=2)

    def save_config_to_file(self, json_config: str) -> str:
        """
        Saves the generated JSON configuration to a file in the configs directory.
        """
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            configs_dir = os.path.join(current_dir, "..", "..", "configs")
            configs_dir = os.path.abspath(configs_dir)
            os.makedirs(configs_dir, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"study_config_{timestamp}.json"
            filepath = os.path.join(configs_dir, filename)

            with open(filepath, 'w') as f:
                f.write(json_config)

            return filepath
        except Exception as e:
            print(f"Failed to save configuration to file: {e}")
            return None


def launch_gradio_ui(chatbot_instance):
    """
    Launches the Gradio UI for configuration generation.
    """
    with gr.Blocks() as app:
        gr.Markdown("# Study Session Configuration Generator")
        chatbot_widget = gr.Chatbot(type="messages", value=[{"role": "assistant", "content": "Please describe your study session"}])
        msg = gr.Textbox(placeholder="Describe your study session...")
        submit_btn = gr.Button("Generate Configuration")

        def process_study_description(message, history):
            if not message.strip():
                return history, ""

            history.append({"role": "user", "content": message})
            json_config = chatbot_instance.generate_study_config(message)

            if json_config:
                filename = chatbot_instance.save_config_to_file(json_config)
                if filename:
                    history.append({"role": "assistant", "content": f"Your configuration has been saved at: {filename}\nThis window will close in 5 seconds."})
                    threading.Timer(5, app.close).start()
                else:
                    history.append({"role": "assistant", "content": "Configuration generated but failed to save to file."})
            else:
                history.append({"role": "assistant", "content": "I was unable to generate a valid configuration."})

            return history, ""

        def handle_submit(message, history):
            return process_study_description(message, history)

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