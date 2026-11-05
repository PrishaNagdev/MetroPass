# face_engine.py
import io
import torch
import numpy as np
from PIL import Image

# Import initialized MTCNN, InceptionResnetV1, and detector from facenet_v2.py
from facenet_v2 import detector, facenet, DEVICE

def get_face_embedding(image_bytes: bytes) -> np.ndarray:
    """
    Takes raw image bytes from an upload or camera frame,
    runs MTCNN detection and extraction, and returns a 512-d normalized embedding.
    Includes fallback to center-crop normalization if MTCNN does not detect a face (e.g. tightly-cropped inputs).
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # 1. Detect and crop face using MTCNN
    try:
        boxes, probs = detector.detect(image)
    except Exception:
        boxes, probs = None, None
    
    if boxes is not None and len(boxes) > 0:
        # Select the largest face box (in case of background faces)
        largest_idx = max(
            range(len(boxes)),
            key=lambda i: (boxes[i][2] - boxes[i][0]) * (boxes[i][3] - boxes[i][1])
        )
        selected_box = [boxes[largest_idx]]
        
        # 2. Extract standard aligned face tensor
        face_tensor = detector.extract(image, np.asarray(selected_box), save_path=None)
        if face_tensor is not None:
            if face_tensor.ndim == 3:
                face_tensor = face_tensor.unsqueeze(0)
            face_tensor = face_tensor.to(DEVICE)
            
            # 3. Generate 512-d L2-normalized embedding
            with torch.no_grad():
                embedding = facenet(face_tensor)
                embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)
            return embedding[0].cpu().numpy()

    # Fallback for already cropped faces or when MTCNN returns no box:
    # Resize to standard (160, 160) and normalize [-1, 1]
    img_resized = image.resize((160, 160))
    img_np = np.float32(np.array(img_resized))
    img_norm = (img_np - 127.5) / 128.0
    face_tensor = torch.tensor(img_norm, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        embedding = facenet(face_tensor)
        embedding = torch.nn.functional.normalize(embedding, p=2, dim=1)
    return embedding[0].cpu().numpy()

