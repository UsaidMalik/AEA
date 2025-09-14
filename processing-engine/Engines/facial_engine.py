import cv2
from deepface import DeepFace
import logging
import threading
import time
from utils.buffer_parser import parse_buffer
from collections import deque

class FacialEngine:
    def __init__(self, camera_index=0, action_config=None, safety_buffer_max_size=1, percentage=0.6):
        """
        Initialize the Facial Engine
        
        Args:
            camera_index (int): Camera index for video capture (default: 0)
        """
        self.camera_index = camera_index
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.cap = None
        self.is_running = False
        self.detection_thread = None
        self.window_name = 'Real-time Emotion Detection'
        self.percentage = percentage
        self.action_config = action_config if action_config is not None else {"banned_emotions": ["neutral"]}
        self.fps = 30
        self.safety_buffer_max_size = safety_buffer_max_size
        self.safety_buffer = deque(maxlen=floor(self.safety_buffer_max_size*self.fps))
        # this is here as a buffer to store the emotions if it full with a certain emotion that means that the emotion is set really and not deviating from the goal
                 
        # Detection parameters
        self.scale_factor = 1.1
        self.min_neighbors = 5
        self.min_size = (30, 30)

        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def start_detection(self):
        """Start the emotion detection process in a separate thread"""
        if self.is_running:
            self.logger.warning("Detection is already running")
            return False
        
        try:
            self.cap = cv2.VideoCapture(self.camera_index)
            if not self.cap.isOpened():
                self.logger.error(f"Cannot open camera {self.camera_index}")
                return False
            
            self.is_running = True
            self.detection_thread = threading.Thread(target=self._detection_loop)
            self.detection_thread.start()
            self.logger.info("Emotion detection started")
            self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30
            self.safety_buffer = deque(maxlen=self.safety_buffer_max_size*self.fps)

            return True
            
        except Exception as e:
            self.logger.error(f"Error starting detection: {e}")
            return False
    
    def stop_detection(self):
        """Stop the emotion detection process"""
        if not self.is_running:
            self.logger.warning("Detection is not running")
            return
        
        self.is_running = False
        
        if self.detection_thread:
            self.detection_thread.join()
        
        if self.cap:
            self.cap.release()
        
        cv2.destroyAllWindows()
        self.logger.info("Emotion detection stopped")
    
    def _detection_loop(self):
        """Main detection loop - runs in separate thread"""
        while self.is_running:
            ret, frame = self.cap.read()
            if not ret:
                self.logger.error("Failed to read frame from camera")
                break
            
            # Process the frame
            processed_frame = self._process_frame(frame)
            
            # Display the frame
            cv2.imshow(self.window_name, processed_frame)
            
            # Check for quit key or window close
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or cv2.getWindowProperty(self.window_name, cv2.WND_PROP_VISIBLE) < 1:
                break
        
        self.is_running = False
    
    def _process_frame(self, frame):
        """
        Process a single frame for emotion detection
        
        Args:
            frame: Input frame from camera
            
        Returns:
            Processed frame with emotion annotations
        """
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray_frame, 
            scaleFactor=self.scale_factor, 
            minNeighbors=self.min_neighbors, 
            minSize=self.min_size
        )
        
        for (x, y, w, h) in faces:
            # Extract face ROI from the original frame
            face_roi = frame[y:y + h, x:x + w]
            
            try:
                # Analyze emotion using DeepFace
                result = DeepFace.analyze(face_roi, actions=['emotion'], enforce_detection=False)
                emotion = result[0]['dominant_emotion']
                self.logger.info(f"Emotion: {emotion}")
                self.safety_buffer.append(emotion)
                confidence = result[0]['emotion'][emotion]
                if parse_buffer(self.safety_buffer, self.percentage, self.safety_buffer_max_size) in self.action_config['banned_emotions']:
                    self.logger.info(f"HEY YOU YOU'RE DEVIATING FROM YOUR GOAL")
                
                # Draw rectangle and emotion label
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
                label = f"{emotion} ({confidence:.1f}%)"
                cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
                
            except Exception as e:
                self.logger.warning(f"Error analyzing face: {e}")
                # Draw rectangle without emotion label
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
                cv2.putText(frame, "Unknown", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
        
        return frame
    
    def is_detection_running(self):
        """Check if detection is currently running"""
        return self.is_running
    
    def set_detection_parameters(self, scale_factor=None, min_neighbors=None, min_size=None):
        """
        Update detection parameters
        
        Args:
            scale_factor (float): How much the image size is reduced at each scale
            min_neighbors (int): How many neighbors each candidate rectangle should have to retain it
            min_size (tuple): Minimum possible object size
        """
        if scale_factor is not None:
            self.scale_factor = scale_factor
        if min_neighbors is not None:
            self.min_neighbors = min_neighbors
        if min_size is not None:
            self.min_size = min_size
        
        self.logger.info(f"Detection parameters updated: scale_factor={self.scale_factor}, "
                        f"min_neighbors={self.min_neighbors}, min_size={self.min_size}")
        
import time

if __name__ == "__main__":
    engine = FacialEngine(camera_index=0)  # Use 0 or another index if needed
    if engine.start_detection():
        print("Emotion detection started. Press 'q' to quit.")
    else:
        print("Could not start emotion detection.")
    
    # Keep main thread alive while detection runs
    try:
        while engine.is_detection_running():
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("Interrupted by user.")
    
    engine.stop_detection()
    print("Emotion detection stopped.")

