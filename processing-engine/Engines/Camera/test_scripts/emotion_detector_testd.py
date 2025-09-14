import time
import logging
import cv2
import sys
from pathlib import Path
import numpy as np

# Add parent directory to path if needed
sys.path.append(str(Path(__file__).parent.parent))

from Engines.Camera.detectors.facial_detector import FacialDetector
from Engines.Camera.detectors.emotion_detector import EmotionDetector

# Emotion colors for visualization (BGR format)
EMOTION_COLORS = {
    "happy": (0, 255, 0),      # Green
    "sad": (255, 0, 0),        # Blue
    "anger": (0, 0, 255),      # Red
    "surprise": (0, 255, 255), # Yellow
    "fear": (255, 0, 255),     # Magenta
    "disgust": (0, 128, 255),  # Orange
    "neutral": (128, 128, 128),# Gray
    "contempt": (255, 255, 0), # Cyan
    "unknown": (64, 64, 64)    # Dark gray
}

def run_emotion_detector_e2e(timeout=60, camera_index=0, face_model_path=None, emotion_model_path=None):
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger("EmotionDetectorE2E")

    logger.info("🔍 Initializing Face Detector...")
    
    # Face detection model
    if face_model_path:
        face_model_name = face_model_path
    else:
        face_model_name = 'qualcomm-media/qualcomm-mediapipe.onnx'  # Default model
    
    try:
        # Initialize face detector
        face_detector = FacialDetector(
            model_name=face_model_name,
            conf_thresh=0.4,  # Lower threshold for better detection
            iou_thresh=0.3
        )
        
        face_model_info = face_detector.get_model_info()
        logger.info(f"✅ Face model loaded: {face_model_info['input_shape']}")
        
        # Initialize emotion detector
        logger.info("🎭 Initializing Emotion Detector...")
        if emotion_model_path:
            emotion_detector = EmotionDetector(model_name=emotion_model_path)
        else:
            emotion_detector = EmotionDetector()
        
        emotion_model_info = emotion_detector.get_model_info()
        logger.info(f"✅ Emotion model loaded:")
        logger.info(f"   Input size: {emotion_model_info['input_size']}")
        logger.info(f"   Classes: {emotion_model_info['labels']}")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize detectors: {e}")
        return

    # Open camera
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        logger.error("❌ Failed to open camera")
        return

    # Set camera resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    logger.info("📷 Camera opened successfully")
    logger.info(f"Resolution: {cap.get(cv2.CAP_PROP_FRAME_WIDTH)}x{cap.get(cv2.CAP_PROP_FRAME_HEIGHT)}")
    
    # Statistics tracking
    start_time = time.time()
    frame_count = 0
    face_detect_time_total = 0
    emotion_detect_time_total = 0
    emotion_counts = {label: 0 for label in emotion_detector.labels}
    emotion_counts["unknown"] = 0
    
    logger.info("🎬 Starting emotion detection...")
    logger.info("Press 'q' to quit, 's' to save screenshot, 'r' to reset stats")

    while (time.time() - start_time) < timeout:
        ret, frame = cap.read()
        if not ret:
            logger.warning("⚠️ Frame read failed")
            continue

        frame_count += 1
        frame_display = frame.copy()
        
        # Detect faces
        face_start = time.time()
        faces = face_detector.detect_faces(frame)
        face_detect_time = time.time() - face_start
        face_detect_time_total += face_detect_time
        
        # Process each detected face
        emotions_in_frame = []
        emotion_start = time.time()
        
        for idx, (x1, y1, x2, y2, conf) in enumerate(faces):
            # Ensure valid coordinates
            x1 = max(0, min(x1, frame.shape[1]-1))
            y1 = max(0, min(y1, frame.shape[0]-1))
            x2 = max(x1+1, min(x2, frame.shape[1]))
            y2 = max(y1+1, min(y2, frame.shape[0]))
            
            # Skip invalid boxes
            if x2 <= x1 or y2 <= y1:
                continue
            
            # Extract face ROI with padding
            padding = 10
            y1_pad = max(0, y1 - padding)
            y2_pad = min(frame.shape[0], y2 + padding)
            x1_pad = max(0, x1 - padding)
            x2_pad = min(frame.shape[1], x2 + padding)
            
            face_roi = frame[y1_pad:y2_pad, x1_pad:x2_pad]
            
            if face_roi.size == 0:
                continue
            
            # Predict emotion
            try:
                emotion, emotion_conf = emotion_detector.predict_emotion(face_roi)
                emotions_in_frame.append(emotion)
                emotion_counts[emotion] += 1
            except Exception as e:
                logger.debug(f"Emotion prediction failed for face {idx}: {e}")
                emotion, emotion_conf = "unknown", 0.0
                emotion_counts["unknown"] += 1
            
            # Get color for emotion
            color = EMOTION_COLORS.get(emotion, EMOTION_COLORS["unknown"])
            
            # Draw bounding box with emotion color
            cv2.rectangle(frame_display, (x1, y1), (x2, y2), color, 2)
            
            # Create label with face confidence and emotion
            label = f"{emotion}: {emotion_conf:.1%}"
            sub_label = f"Face: {conf:.1%}"
            
            # Calculate text size for background
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.6
            thickness = 2
            
            (label_w, label_h), _ = cv2.getTextSize(label, font, font_scale, thickness)
            (sub_label_w, sub_label_h), _ = cv2.getTextSize(sub_label, font, font_scale-0.1, 1)
            
            max_label_w = max(label_w, sub_label_w)
            
            # Draw background rectangle for text
            cv2.rectangle(frame_display,
                         (x1, y1 - label_h - sub_label_h - 10),
                         (x1 + max_label_w + 10, y1),
                         color, -1)
            
            # Draw emotion text
            cv2.putText(frame_display, label,
                       (x1 + 5, y1 - sub_label_h - 5),
                       font, font_scale, (255, 255, 255), thickness)
            
            # Draw face confidence text
            cv2.putText(frame_display, sub_label,
                       (x1 + 5, y1 - 5),
                       font, font_scale-0.1, (200, 200, 200), 1)
        
        emotion_detect_time = time.time() - emotion_start
        emotion_detect_time_total += emotion_detect_time
        
        # Calculate statistics
        elapsed = time.time() - start_time
        fps = frame_count / elapsed if elapsed > 0 else 0
        avg_face_time = (face_detect_time_total / frame_count * 1000) if frame_count > 0 else 0
        avg_emotion_time = (emotion_detect_time_total / frame_count * 1000) if frame_count > 0 else 0
        
        # Draw statistics overlay
        stats_y = 30
        stats_x = 10
        line_height = 25
        
        # Background for stats
        cv2.rectangle(frame_display, (5, 5), (250, 150), (0, 0, 0), -1)
        cv2.rectangle(frame_display, (5, 5), (250, 150), (255, 255, 255), 1)
        
        stats = [
            f"FPS: {fps:.1f}",
            f"Faces: {len(faces)}",
            f"Face detect: {avg_face_time:.1f}ms",
            f"Emotion detect: {avg_emotion_time:.1f}ms",
            f"Current: {', '.join(emotions_in_frame) if emotions_in_frame else 'None'}"
        ]
        
        for stat in stats:
            cv2.putText(frame_display, stat, (stats_x, stats_y),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            stats_y += line_height
        
        # Draw emotion distribution on the right side
        if frame_count > 0 and sum(emotion_counts.values()) > 0:
            dist_x = frame_display.shape[1] - 200
            dist_y = 30
            
            # Background for distribution
            cv2.rectangle(frame_display, (dist_x - 5, 5), 
                         (frame_display.shape[1] - 5, 30 + len(emotion_counts) * 20), 
                         (0, 0, 0), -1)
            cv2.rectangle(frame_display, (dist_x - 5, 5), 
                         (frame_display.shape[1] - 5, 30 + len(emotion_counts) * 20), 
                         (255, 255, 255), 1)
            
            cv2.putText(frame_display, "Emotion Distribution:", (dist_x, dist_y - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
            
            total_emotions = sum(emotion_counts.values())
            for emotion, count in sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True):
                if count > 0:
                    percentage = (count / total_emotions) * 100
                    color = EMOTION_COLORS.get(emotion, (128, 128, 128))
                    text = f"{emotion}: {percentage:.1f}%"
                    cv2.putText(frame_display, text, (dist_x, dist_y),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
                    dist_y += 20
        
        # Log periodic updates
        if frame_count % 30 == 0:
            logger.info(f"Frame {frame_count}: {len(faces)} faces | "
                       f"Face: {face_detect_time*1000:.1f}ms | "
                       f"Emotion: {emotion_detect_time*1000:.1f}ms | "
                       f"FPS: {fps:.1f}")
        
        # Display frame
        cv2.imshow("Emotion Detection - Press 'q' to quit", frame_display)
        
        # Handle keyboard input
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            logger.info("🛑 Quit requested")
            break
        elif key == ord('s'):
            # Save screenshot
            filename = f"emotion_detection_{int(time.time())}.jpg"
            cv2.imwrite(filename, frame_display)
            logger.info(f"📸 Screenshot saved: {filename}")
        elif key == ord('r'):
            # Reset statistics
            emotion_counts = {label: 0 for label in emotion_detector.labels}
            emotion_counts["unknown"] = 0
            logger.info("📊 Statistics reset")
    
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    
    # Print final statistics
    elapsed = time.time() - start_time
    logger.info("="*60)
    logger.info("✅ Emotion Detection E2E Test Complete!")
    logger.info(f"📊 Final Statistics:")
    logger.info(f"   Total runtime: {elapsed:.1f} seconds")
    logger.info(f"   Total frames: {frame_count}")
    logger.info(f"   Average FPS: {frame_count/elapsed:.1f}")
    logger.info(f"   Avg face detection: {avg_face_time:.1f}ms")
    logger.info(f"   Avg emotion detection: {avg_emotion_time:.1f}ms")
    logger.info(f"   Total faces detected: {sum(emotion_counts.values())}")
    
    if sum(emotion_counts.values()) > 0:
        logger.info(f"   Emotion distribution:")
        for emotion, count in sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                percentage = (count / sum(emotion_counts.values())) * 100
                logger.info(f"      {emotion}: {count} ({percentage:.1f}%)")
    
    logger.info("="*60)

if __name__ == "__main__":
    # Run with default settings
    #run_emotion_detector_e2e(timeout=300, camera_index=0)
    
    # Or specify custom model paths:
    run_emotion_detector_e2e(
        timeout=600, 
        camera_index=0,
        face_model_path="qualcomm-media/qualcomm-mediapipe.onnx",
        emotion_model_path="emotion-ferplus-8.onnx"
    )