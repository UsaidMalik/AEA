import cv2
import numpy as np
import onnxruntime as ort
from pathlib import Path
import logging

class FacialDetector:
    def __init__(self, model_name="MediaPipe-Face-Detection.onnx", conf_thresh=0.5, iou_thresh=0.3):
        self.logger = logging.getLogger(__name__)
        self.conf_thresh = conf_thresh
        self.iou_thresh = iou_thresh
        self.input_size = 256  # as per model spec
        
        # BlazeFace anchor parameters
        self.num_anchors = 896  # Standard for BlazeFace 256x256
        self.decode_box_coords = True
        
        self._load_model(model_name)
        self._generate_anchors()

    def _load_model(self, model_name):
        script_dir = Path(__file__).resolve().parent
        model_path = script_dir / "models" / "facial_detection" / model_name
        
        so = ort.SessionOptions()
        so.enable_profiling = False
        so.log_severity_level = 3  # Reduce verbosity
        
        try:
            # Use CPU or available accelerator
            providers = ort.get_available_providers()
            self.session = ort.InferenceSession(str(model_path), providers=providers, sess_options=so)
            self.logger.info(f"Loaded model {model_name} with providers: {providers}")
        except Exception as e:
            self.logger.error(f"Failed to load model {model_name}: {e}")
            raise e

        # Input metadata
        input_meta = self.session.get_inputs()[0]
        self.input_name = input_meta.name
        self.input_shape = input_meta.shape
        self.logger.info(f"Model input shape: {self.input_shape}")

        # Output metadata
        self.output_names = [o.name for o in self.session.get_outputs()]
        output_shapes = [o.shape for o in self.session.get_outputs()]
        self.logger.info(f"Model outputs: {list(zip(self.output_names, output_shapes))}")

    def _generate_anchors(self):
        """Generate BlazeFace anchors for 256x256 input."""
        anchors = []
        
        # Layer configurations for BlazeFace
        # 16x16 feature map (8 anchors per cell)
        layer_size = 16
        anchor_count = 2
        for y in range(layer_size):
            for x in range(layer_size):
                for n in range(anchor_count):
                    cx = (x + 0.5) / layer_size
                    cy = (y + 0.5) / layer_size
                    anchors.append([cx, cy])
        
        # 8x8 feature map (6 anchors per cell)
        layer_size = 8
        anchor_count = 6
        for y in range(layer_size):
            for x in range(layer_size):
                for n in range(anchor_count):
                    cx = (x + 0.5) / layer_size
                    cy = (y + 0.5) / layer_size
                    anchors.append([cx, cy])
        
        self.anchors = np.array(anchors, dtype=np.float32)
        self.logger.info(f"Generated {len(self.anchors)} anchors")

    def preprocess(self, frame):
        """Resize, normalize, format input tensor."""
        # Resize to 256x256
        img = cv2.resize(frame, (self.input_size, self.input_size))
        
        # Convert BGR to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Normalize to [0,1] or [-1,1] depending on model
        # Most MediaPipe models use [0,1]
        img_norm = img_rgb.astype(np.float32) / 255.0
        
        # Check input shape and transpose accordingly
        if len(self.input_shape) == 4:
            if self.input_shape[1] == 3:  # NCHW format
                img_tensor = np.transpose(img_norm, (2, 0, 1))
                img_tensor = np.expand_dims(img_tensor, axis=0)
            else:  # NHWC format
                img_tensor = np.expand_dims(img_norm, axis=0)
        else:
            img_tensor = np.expand_dims(img_norm, axis=0)
            
        return img_tensor

    def postprocess(self, outputs, frame_shape):
        """
        Parse BlazeFace outputs and decode bounding boxes.
        Typical outputs:
        - Regression (boxes): [1, 896, 16] - contains box coords and keypoints
        - Classification (scores): [1, 896, 1] or [1, 896]
        """
        H, W, _ = frame_shape
        
        # Parse outputs based on shape
        regressors = None
        classificators = None
        
        for i, output in enumerate(outputs):
            shape = output.shape
            self.logger.debug(f"Output {i} shape: {shape}")
            
            # Identify regression output (boxes + keypoints)
            if len(shape) >= 2 and shape[1] == self.num_anchors:
                if shape[-1] == 16:  # 4 box coords + 6 keypoints * 2
                    regressors = output[0]  # Remove batch dimension
                elif shape[-1] == 1 or len(shape) == 2:  # Classification scores
                    classificators = output[0]
                    if len(classificators.shape) > 1:
                        classificators = classificators.squeeze(-1)
        
        # Alternative output format check
        if regressors is None or classificators is None:
            # Try different indexing
            if len(outputs) >= 2:
                # Assume first is classification, second is regression
                classificators = outputs[0][0]
                regressors = outputs[1][0]
                
                if len(classificators.shape) > 1:
                    classificators = classificators.squeeze(-1)
        
        if regressors is None or classificators is None:
            self.logger.error("Could not identify model outputs correctly")
            return []
        
        # Apply sigmoid to get probabilities
        scores = 1 / (1 + np.exp(-classificators))
        
        faces = []
        for i in range(self.num_anchors):
            score = scores[i] if i < len(scores) else 0
            
            if score < self.conf_thresh:
                continue
            
            # Decode box coordinates
            if self.decode_box_coords and i < len(self.anchors):
                anchor = self.anchors[i]
                
                # Extract box regression values
                box = regressors[i][:4]
                
                # Decode center-based coordinates
                cx = box[0] / self.input_size + anchor[0]
                cy = box[1] / self.input_size + anchor[1]
                w = box[2] / self.input_size
                h = box[3] / self.input_size
                
                # Convert to corner coordinates
                x1 = cx - w * 0.5
                y1 = cy - h * 0.5
                x2 = cx + w * 0.5
                y2 = cy + h * 0.5
            else:
                # Direct interpretation if anchors not used
                box = regressors[i][:4]
                x1, y1, x2, y2 = box[0], box[1], box[2], box[3]
            
            # Clip to [0,1]
            x1 = max(0.0, min(1.0, x1))
            y1 = max(0.0, min(1.0, y1))
            x2 = max(0.0, min(1.0, x2))
            y2 = max(0.0, min(1.0, y2))
            
            # Convert to pixel coordinates
            x1_px = int(x1 * W)
            y1_px = int(y1 * H)
            x2_px = int(x2 * W)
            y2_px = int(y2 * H)
            
            faces.append([x1_px, y1_px, x2_px, y2_px, float(score)])
        
        # Apply NMS
        faces_nms = self._non_max_suppression(faces, self.iou_thresh)
        return faces_nms

    def detect_faces(self, frame):
        """Main detection function."""
        inp = self.preprocess(frame)
        raw_outputs = self.session.run(self.output_names, {self.input_name: inp})
        faces = self.postprocess(raw_outputs, frame.shape)
        return faces

    def _non_max_suppression(self, faces, iou_thresh=0.3):
        """Apply Non-Maximum Suppression to remove overlapping boxes."""
        if not faces:
            return []
        
        boxes = np.array([[f[0], f[1], f[2], f[3]] for f in faces])
        scores = np.array([f[4] for f in faces])
        
        # Sort by score
        order = scores.argsort()[::-1]
        keep = []
        
        while order.size > 0:
            i = order[0]
            keep.append(i)
            
            # Calculate IoU with remaining boxes
            xx1 = np.maximum(boxes[i, 0], boxes[order[1:], 0])
            yy1 = np.maximum(boxes[i, 1], boxes[order[1:], 1])
            xx2 = np.minimum(boxes[i, 2], boxes[order[1:], 2])
            yy2 = np.minimum(boxes[i, 3], boxes[order[1:], 3])
            
            inter_w = np.maximum(0, xx2 - xx1)
            inter_h = np.maximum(0, yy2 - yy1)
            inter = inter_w * inter_h
            
            area_i = (boxes[i, 2] - boxes[i, 0]) * (boxes[i, 3] - boxes[i, 1])
            area_rest = (boxes[order[1:], 2] - boxes[order[1:], 0]) * \
                       (boxes[order[1:], 3] - boxes[order[1:], 1])
            union = area_i + area_rest - inter
            
            iou = inter / (union + 1e-6)
            
            # Keep boxes with IoU less than threshold
            order = order[np.where(iou <= iou_thresh)[0] + 1]
        
        return [faces[k] for k in keep]

    def get_model_info(self):
        """Get information about the loaded model."""
        info = {
            "input_name": self.input_name,
            "input_shape": self.input_shape,
            "outputs": []
        }
        
        for output in self.session.get_outputs():
            info["outputs"].append({
                "name": output.name,
                "shape": output.shape,
                "type": output.type
            })
        
        return info