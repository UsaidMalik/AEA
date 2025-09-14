import time
import logging
import cv2
from pathlib import Path
from Engines.Camera.detectors.facial_detector import FacialDetector  # Update path if needed

def run_emotion_detector_e2e(timeout=10, camera_index=0, model_path=None):
    # Setup logging with more detail
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger("FacialDetectorE2E")

    logger.info("🔍 Initializing FacialDetector...")
    
    # Use the correct model name/path
    # You might need to adjust this based on where you downloaded the model
    if model_path:
        model_name = model_path
    else:
        # Try common names for the Qualcomm model
        # Or if you downloaded with a different name:
        model_name = 'qualcomm-media/qualcomm-mediapipe.onnx'
    
    try:
        detector = FacialDetector(
            model_name=model_name,
            conf_thresh=0.5,  # Adjust threshold as needed
            iou_thresh=0.3
        )
        
        # Print model info for debugging
        model_info = detector.get_model_info()
        logger.info(f"Model loaded successfully!")
        logger.info(f"Model info: {model_info}")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize detector: {e}")
        return

    # Open camera
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        logger.error("❌ Failed to open camera")
        return

    # Set camera resolution (optional)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    logger.info("📷 Camera opened successfully.")
    logger.info(f"Camera resolution: {cap.get(cv2.CAP_PROP_FRAME_WIDTH)}x{cap.get(cv2.CAP_PROP_FRAME_HEIGHT)}")
    
    start_time = time.time()
    frame_count = 0
    total_inference_time = 0
    
    logger.info("🧪 Running face detection E2E test...")
    logger.info("Press 'q' to quit, 's' to save screenshot")

    while time.time() - start_time < timeout:
        ret, frame = cap.read()
        if not ret:
            logger.warning("⚠️ Frame read failed")
            continue

        frame_count += 1
        
        # Measure inference time
        inference_start = time.time()
        faces = detector.detect_faces(frame)
        inference_time = time.time() - inference_start
        total_inference_time += inference_time
        
        # Log detection results every 30 frames
        if frame_count % 30 == 0:
            avg_fps = frame_count / (time.time() - start_time)
            avg_inference = total_inference_time / frame_count * 1000
            logger.info(f"Frame {frame_count}: Detected {len(faces)} face(s) | "
                       f"Inference: {inference_time*1000:.1f}ms | "
                       f"Avg: {avg_inference:.1f}ms | "
                       f"FPS: {avg_fps:.1f}")

        # Draw detections
        for idx, (x1, y1, x2, y2, conf) in enumerate(faces):
            # Ensure coordinates are within frame boundaries
            x1 = max(0, min(x1, frame.shape[1]-1))
            y1 = max(0, min(y1, frame.shape[0]-1))
            x2 = max(0, min(x2, frame.shape[1]-1))
            y2 = max(0, min(y2, frame.shape[0]-1))

            print(f"x1: {x1}, y1: {y1}, x2: {x2}, y2: {y2}, conf: {conf}")

            # Skip invalid boxes
            if x2 <= x1 or y2 <= y1:
                continue

            # Draw bounding box
            color = (0, 255, 0)  # Green for face
            cv2.rectangle(frame, (x1, y1), (x2, y2), color=color, thickness=2)

            # Draw confidence and index
            label = f"Face {idx}: {conf:.2%}"
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            
            # Background for text
            cv2.rectangle(frame, 
                         (x1, y1 - label_size[1] - 10),
                         (x1 + label_size[0], y1),
                         color, -1)
            
            # Draw text
            cv2.putText(frame, label, (x1, y1 - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Add stats overlay
        stats_text = [
            f"Faces: {len(faces)}",
            f"FPS: {frame_count / (time.time() - start_time):.1f}",
            f"Inference: {inference_time*1000:.1f}ms"
        ]
        
        y_offset = 30
        for text in stats_text:
            cv2.putText(frame, text, (10, y_offset),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            y_offset += 30

        # Show the frame
        cv2.imshow("FacialDetector E2E Test", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            logger.info("🛑 Quit key pressed. Exiting.")
            break
        elif key == ord('s'):
            # Save screenshot
            filename = f"face_detection_{int(time.time())}.jpg"
            cv2.imwrite(filename, frame)
            logger.info(f"📸 Screenshot saved as {filename}")

    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    
    # Print final statistics
    elapsed = time.time() - start_time
    logger.info("="*50)
    logger.info("✅ E2E test complete!")
    logger.info(f"Total runtime: {elapsed:.1f} seconds")
    logger.info(f"Total frames: {frame_count}")
    logger.info(f"Average FPS: {frame_count/elapsed:.1f}")
    logger.info(f"Average inference time: {total_inference_time/frame_count*1000:.1f}ms")
    logger.info("="*50)

if __name__ == "__main__":
    # You can specify the model path here if needed
    # For example: model_path = "path/to/your/MediaPipe-Face-Detection.onnx"
    
    # Run with default settings
    run_emotion_detector_e2e(timeout=300, camera_index=0)
    
    # Or specify a custom model path:
    # run_facial_detector_e2e(timeout=30, camera_index=0, model_path="custom_model.onnx")