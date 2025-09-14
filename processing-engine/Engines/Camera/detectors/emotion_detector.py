import numpy as np
import onnxruntime as ort
import cv2
from pathlib import Path
import logging

class EmotionDetector:
    def __init__(self, model_name="emotion-ferplus-8.onnx"):
        self.logger = logging.getLogger(__name__)
        # Labels for the FER+ model as specified in the documentation.
        # This is a different order and set than your previous model.
        self.labels = ["neutral", "happiness", "surprise", "sadness", "anger", "disgust", "fear", "contempt"]
        self.input_size = (64, 64) # The FER+ model expects 64x64 input
        self.model_name = model_name
        self._load_model()

    def _load_model(self):
        script_dir = Path(__file__).resolve().parent
        model_path = script_dir / "models" / "emotional_detection" / self.model_name
        
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found at {model_path}")
        
        providers = ["CPUExecutionProvider"]
        
        try:
            onnxruntime_dir = Path(ort.__file__).resolve().parent
            hexagon_driver = onnxruntime_dir / "capi" / "QnnHtp.dll"
            
            if hexagon_driver.exists():
                qnn_opts = {"backend_path": str(hexagon_driver)}
                providers = [("QNNExecutionProvider", qnn_opts), "CPUExecutionProvider"]
                self.logger.info("QNN provider available for Snapdragon acceleration")
        except Exception as e:
            self.logger.debug(f"QNN provider not available: {e}")

        so = ort.SessionOptions()
        so.enable_profiling = False
        so.log_severity_level = 3
        
        try:
            self.session = ort.InferenceSession(
                str(model_path),
                providers=providers,
                sess_options=so
            )
            active_providers = [p for p in self.session.get_providers()]
            self.logger.info(f"Emotion model loaded with providers: {active_providers}")
        except Exception as e:
            self.logger.error(f"Failed to load emotion model: {e}")
            raise

        input_meta = self.session.get_inputs()[0]
        self.input_name = input_meta.name
        self.input_shape = input_meta.shape
        self.logger.info(f"Model input shape: {self.input_shape}")
        self.logger.info(f"Model input size: {self.input_size}")
        
        output_meta = self.session.get_outputs()[0]
        self.output_shape = output_meta.shape
        self.logger.info(f"Model output shape: {self.output_shape}")
        
        if len(self.output_shape) > 1:
            num_classes = self.output_shape[-1]
            if num_classes != len(self.labels):
                self.logger.warning(f"Model has {num_classes} classes but {len(self.labels)} labels defined")
                if num_classes > len(self.labels):
                    self.labels.extend([f"class_{i}" for i in range(len(self.labels), num_classes)])
                elif num_classes < len(self.labels):
                    self.labels = self.labels[:num_classes]

    def preprocess_face(self, face_roi):
        """
        Preprocess face region for the FER+ model.
        It converts the face to grayscale and resizes it to 64x64.
        """
        if face_roi is None or face_roi.size == 0:
            raise ValueError("Invalid face ROI")
        
        # 1. Convert to grayscale. The FER+ model is a single-channel model.
        face_gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        
        # 2. Resize to the model's expected 64x64 input size
        face_resized = cv2.resize(face_gray, self.input_size)
        
        # 3. Add the channel dimension (1) and batch dimension (1)
        # The model expects shape (1, 1, 64, 64)
        face_tensor = np.expand_dims(face_resized, axis=0)
        face_tensor = np.expand_dims(face_tensor, axis=0).astype(np.float32)
        
        # The model's documentation does not specify any normalization beyond resizing.
        # It likely expects raw pixel values in the [0, 255] range.
        
        return face_tensor

    def predict_emotion(self, face_roi):
        """Predict emotion from face ROI."""
        try:
            face_tensor = self.preprocess_face(face_roi)
            
            outputs = self.session.run(None, {self.input_name: face_tensor})
            
            logits = outputs[0]
            
            if logits.shape[0] == 1:
                logits = logits[0]
            
            # The documentation specifies applying a softmax function
            probabilities = self._softmax(logits)
            
            idx = int(np.argmax(probabilities))
            confidence = float(probabilities[idx])
            emotion = self.labels[idx]
            
            return emotion, confidence
            
        except Exception as e:
            self.logger.error(f"Emotion prediction failed: {e}")
            raise

    def predict_emotions_batch(self, face_rois):
        """Predict emotions for multiple faces."""
        results = []
        for face_roi in face_rois:
            try:
                emotion, confidence = self.predict_emotion(face_roi)
                results.append((emotion, confidence))
            except Exception as e:
                self.logger.warning(f"Failed to predict emotion for a face: {e}")
                results.append(("unknown", 0.0))
        return results

    def _softmax(self, x):
        """Compute softmax values."""
        exp_x = np.exp(x - np.max(x))
        return exp_x / np.sum(exp_x)

    def get_model_info(self):
        """Get information about the loaded model."""
        return {
            "input_name": self.input_name,
            "input_shape": self.input_shape,
            "input_size": self.input_size,
            "output_shape": self.output_shape,
            "num_classes": len(self.labels),
            "labels": self.labels
        }