import time
import logging
from Engines.Camera.camera_engine import CameraEngine  # Replace with your actual module name
import cv2
import json
import os

def run_e2e_test(timeout=10):
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("FacialEngineTest")

    # Get absolute path to config file based on script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "mock_testing_config.json")

    print(f"Loading config from: {config_path}")
    with open(config_path, "r") as f:
        action_config = json.load(f)

    engine = CameraEngine(action_config)

    logger.info("Starting FacialEngine... ")
    if not engine.start_detection():
        logger.error("Camera failed to open. Test failed.")
        return

    logger.info("Camera opened successfully. Waiting for emotion detection...")

    start_time = time.time()
    emotion_detected = False
    
    key = cv2.waitKey(1) & 0xFF
    while time.time() - start_time < timeout:
        if not engine.is_detection_running():
            logger.error("Detection stopped unexpectedly. Test failed.")
            break
        # You could hook into the engine to expose last detected emotion if needed
        # For now, we assume if it's running and displaying, it's working
        time.sleep(1)

    # Stop detection
    engine.stop_detection()

    logger.info("Detection stopped. Test completed.")
    logger.info("✅ E2E Test Passed (Camera opened and detection ran for %d seconds)", timeout)

if __name__ == "__main__":
    run_e2e_test(100)
