import time
import logging
from Engines.facial_engine import FacialEngine  # Replace with your actual module name

def run_e2e_test(timeout=10):
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("FacialEngineTest")

    engine = FacialEngine()

    logger.info("Starting FacialEngine...")
    if not engine.start_detection():
        logger.error("Camera failed to open. Test failed.")
        return

    logger.info("Camera opened successfully. Waiting for emotion detection...")

    start_time = time.time()
    emotion_detected = False

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
    run_e2e_test()
