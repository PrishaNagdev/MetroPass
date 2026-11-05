
import os
import cv2
import csv
import argparse
import joblib
import numpy as np
import torch
from ultralytics import YOLO

from pathlib import Path
from PIL import Image
from datetime import datetime
from facenet_pytorch import MTCNN, InceptionResnetV1


# =====================================================
# CONFIGURATION
# =====================================================

ROOT = Path(__file__).resolve().parent

ENROLL_DIR = ROOT / "dataset" / "enrollment"
MIXED_DIR = ROOT / "input" / "mixed_videos"

CROP_DIR = ROOT / "processed" / "face_crops"
EMBED_DIR = ROOT / "processed" / "embeddings"

MODEL_DIR = ROOT / "models"
OUTPUT_DIR = ROOT / "output" / "videos"
LOG_DIR = ROOT / "output" / "logs"

IDENTITIES = ["Prisha", "Henil", "Kathan"]

FRAME_INTERVAL = 2
MAX_ENROLL_FRAMES = 3000

# Starting threshold, not a universal FaceNet threshold.
SIMILARITY_THRESHOLD = 0.75
MIN_IDENTITY_MARGIN = 0.15

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

MODEL_FILE = MODEL_DIR / "facenet_v2_1.joblib"

for folder in [
    CROP_DIR, EMBED_DIR, MODEL_DIR,
    OUTPUT_DIR, LOG_DIR
]:
    folder.mkdir(parents=True, exist_ok=True)


# =====================================================
# INITIALIZE FACENET
# =====================================================

print("Device:", DEVICE)

if DEVICE.type == "cuda":
    print("GPU:", torch.cuda.get_device_name(0))

detector = MTCNN(
    image_size=160,
    margin=14,
    min_face_size=40,
    keep_all=True,
    post_process=True,
    device=DEVICE
)

facenet = InceptionResnetV1(
    pretrained="vggface2"
).eval().to(DEVICE)


# =====================================================
# FACE DETECTION
# =====================================================


def detect_faces(frame):

    # Reject invalid frames.
    if frame is None or not isinstance(frame, np.ndarray):
        return None, [], []

    if frame.ndim != 3 or frame.shape[2] != 3:
        return None, [], []

    h, w = frame.shape[:2]

    # MTCNN cannot build its image pyramid for very small crops.
    if min(h, w) < 40:
        return Image.fromarray(
            cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        ), [], []

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image = Image.fromarray(rgb)

    try:
        boxes, probabilities = detector.detect(image)

    except ValueError as error:
        # Handle MTCNN's empty image-pyramid tensor error.
        if "non-empty list of Tensors" in str(error):
            return image, [], []
        raise

    if boxes is None or probabilities is None:
        return image, [], []

    valid_boxes = []
    valid_probabilities = []

    for box, probability in zip(boxes, probabilities):

        if probability is None or probability < 0.90:
            continue

        x1, y1, x2, y2 = map(int, box)

        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(w, x2)
        y2 = min(h, y2)

        if x2 <= x1 or y2 <= y1:
            continue

        valid_boxes.append([x1, y1, x2, y2])
        valid_probabilities.append(float(probability))

    return image, valid_boxes, valid_probabilities


# =====================================================
# EXTRACT FACENET EMBEDDINGS
# =====================================================

def extract_embeddings(image, boxes):

    if len(boxes) == 0:
        return None

    faces = detector.extract(
        image,
        np.asarray(boxes),
        save_path=None
    )

    if faces is None:
        return None

    if faces.ndim == 3:
        faces = faces.unsqueeze(0)

    faces = faces.to(DEVICE)

    with torch.no_grad():

        embeddings = facenet(faces)

        embeddings = torch.nn.functional.normalize(
            embeddings,
            p=2,
            dim=1
        )

    return embeddings.cpu().numpy()


# =====================================================
# SAVE FACE CROP
# =====================================================

def save_face_crop(face_tensor, path):

    # MTCNN post-processed image is approximately [-1, 1].
    image = face_tensor.detach().cpu()

    image = image.permute(1, 2, 0).numpy()

    image = np.clip(
        (image * 128.0) + 127.5,
        0,
        255
    ).astype(np.uint8)

    Image.fromarray(image).save(path)


# =====================================================
# 1. AUTOMATIC IDENTITY ENROLLMENT
# =====================================================

def enroll():
    from sklearn.svm import SVC
    from sklearn.preprocessing import LabelEncoder

    # Only allow Prisha, Henil, Kathan
    EXCLUDED_IDENTITIES = {"Anuj", "Shreenath", "Aryan", "Mann"}
    target_identities = [p for p in IDENTITIES if p not in EXCLUDED_IDENTITIES]
    if ENROLL_DIR.exists():
        discovered = [
            d.name for d in ENROLL_DIR.iterdir()
            if d.is_dir() and not d.name.startswith(".") and d.name not in EXCLUDED_IDENTITIES
        ]
        for name in discovered:
            if name not in target_identities:
                target_identities.append(name)

    target_identities = sorted(list(set(target_identities)))

    # Load existing model if available (filtering out deprecated identities)
    existing_model = None
    if MODEL_FILE.exists():
        try:
            raw_model = joblib.load(MODEL_FILE)
            existing_model = {
                "identities": [i for i in raw_model.get("identities", []) if i not in EXCLUDED_IDENTITIES],
                "training_embeddings": {k: v for k, v in raw_model.get("training_embeddings", {}).items() if k not in EXCLUDED_IDENTITIES},
                "prototypes": {k: v for k, v in raw_model.get("prototypes", {}).items() if k not in EXCLUDED_IDENTITIES},
            }
            if existing_model["identities"]:
                print(f"Loaded existing model checkpoint with active identities: {existing_model['identities']}")
        except Exception as e:
            print("Notice: starting clean enrollment (could not load existing model):", e)

    prototypes = {}
    training_embeddings = {}
    metadata = []
    video_exts = [".mp4", ".avi", ".mov", ".mkv", ".webm"]
    image_exts = [".jpg", ".jpeg", ".png", ".webp", ".bmp"]

    print("\nStarting automatic identity enrollment...\n")

    for person in target_identities:
        person_dir = ENROLL_DIR / person
        videos = []
        images = []
        if person_dir.exists():
            videos = [p for p in person_dir.iterdir() if p.suffix.lower() in video_exts]
            images = [p for p in person_dir.iterdir() if p.suffix.lower() in image_exts]

        person_embeddings = []

        # 1. Process Video Files
        for video in videos:
            print(f"Enrolling {person} from video: {video.name}")
            cap = cv2.VideoCapture(str(video))
            if not cap.isOpened():
                print("Could not open:", video)
                continue

            frame_number = 0
            accepted = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_number % FRAME_INTERVAL != 0:
                    frame_number += 1
                    continue

                image, boxes, probs = detect_faces(frame)
                if boxes:
                    largest_index = max(
                        range(len(boxes)),
                        key=lambda i: ((boxes[i][2] - boxes[i][0]) * (boxes[i][3] - boxes[i][1]))
                    )
                    selected_box = [boxes[largest_index]]
                    face_embeddings = extract_embeddings(image, selected_box)

                    if face_embeddings is not None:
                        embedding = face_embeddings[0]
                        person_embeddings.append(embedding)

                        faces = detector.extract(image, np.asarray(selected_box), save_path=None)
                        crop_path = CROP_DIR / person / f"{video.stem}_{frame_number}.jpg"
                        crop_path.parent.mkdir(parents=True, exist_ok=True)
                        save_face_crop(faces[0], crop_path)

                        metadata.append([person, video.name, frame_number, str(crop_path)])
                        accepted += 1

                frame_number += 1
                if accepted >= MAX_ENROLL_FRAMES:
                    break

            cap.release()
            print(f"Extracted {accepted} face vectors for {person} from {video.name}")

        # 2. Process Image / Photo Files
        for img_path in images:
            print(f"Enrolling {person} from photo: {img_path.name}")
            frame = cv2.imread(str(img_path))
            if frame is None:
                continue

            image, boxes, probs = detect_faces(frame)
            if boxes:
                largest_index = max(
                    range(len(boxes)),
                    key=lambda i: ((boxes[i][2] - boxes[i][0]) * (boxes[i][3] - boxes[i][1]))
                )
                selected_box = [boxes[largest_index]]
                face_embeddings = extract_embeddings(image, selected_box)

                if face_embeddings is not None:
                    person_embeddings.append(face_embeddings[0])
                    faces = detector.extract(image, np.asarray(selected_box), save_path=None)
                    crop_path = CROP_DIR / person / f"{img_path.stem}_crop.jpg"
                    crop_path.parent.mkdir(parents=True, exist_ok=True)
                    save_face_crop(faces[0], crop_path)

                    metadata.append([person, img_path.name, 0, str(crop_path)])
                    print(f"Extracted face vector for {person} from {img_path.name}")

        # 3. Fallback: Retain pre-existing embeddings if raw media is not present
        if not person_embeddings:
            npy_path = EMBED_DIR / f"{person}_embeddings.npy"
            if npy_path.exists():
                person_embeddings = list(np.load(npy_path))
                print(f"Retained existing {len(person_embeddings)} embeddings for {person} from {npy_path.name}")
            elif existing_model and person in existing_model.get("training_embeddings", {}):
                person_embeddings = list(existing_model["training_embeddings"][person])
                print(f"Retained existing {len(person_embeddings)} embeddings for {person} from model checkpoint")
            else:
                print(f"Skipping {person}: no media files and no existing embeddings found.")
                continue

        embeddings = np.asarray(person_embeddings)

        # Compute normalized mean prototype vector
        prototype = embeddings.mean(axis=0)
        prototype = prototype / (np.linalg.norm(prototype) + 1e-10)

        prototypes[person] = prototype
        training_embeddings[person] = embeddings

        np.save(EMBED_DIR / f"{person}_embeddings.npy", embeddings)
        print(f"✓ {person}: {len(embeddings)} embeddings enrolled.")

    if not prototypes:
        raise ValueError(
            "No identities enrolled! Please place video or photo files in backend/dataset/enrollment/<Name>/"
        )

    all_enrolled_identities = sorted(list(prototypes.keys()))

    # Save metadata
    metadata_file = ROOT / "processed" / "metadata.csv"
    with open(metadata_file, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["identity", "video", "frame_number", "crop_path"])
        writer.writerows(metadata)

    # Save complete identity model
    joblib.dump(
        {
            "prototypes": prototypes,
            "training_embeddings": training_embeddings,
            "identities": all_enrolled_identities,
            "threshold": SIMILARITY_THRESHOLD,
            "margin": MIN_IDENTITY_MARGIN
        },
        MODEL_FILE
    )

    # Train and save SVM classifier (facenet_classifier.joblib)
    try:
        X_all = []
        y_all = []
        for person, embs in training_embeddings.items():
            for emb in embs:
                X_all.append(emb)
                y_all.append(person)

        if len(set(y_all)) >= 2:
            le = LabelEncoder()
            y_enc = le.fit_transform(y_all)
            clf = SVC(C=1.0, kernel="linear", probability=True, class_weight="balanced", random_state=42)
            clf.fit(X_all, y_enc)
            classifier_file = MODEL_DIR / "facenet_classifier.joblib"
            joblib.dump(
                {
                    "classifier": clf,
                    "label_encoder": le,
                    "frame_interval": FRAME_INTERVAL
                },
                classifier_file
            )
            print(f"✓ SVM Classifier updated and saved to: {classifier_file}")
            print(f"  Classes ({len(le.classes_)}): {list(le.classes_)}")
    except Exception as e:
        print("Warning: could not train SVM classifier:", e)

    print("\n================================")
    print("AUTOMATIC ENROLLMENT COMPLETE")
    print(f"Enrolled Identities ({len(all_enrolled_identities)}): {all_enrolled_identities}")
    print(f"Model File: {MODEL_FILE}")
    print("================================\n")


# =====================================================
# 2. LOAD IDENTITY MODEL
# =====================================================

def load_model():

    if not MODEL_FILE.exists():
        raise FileNotFoundError(
            "Model not found. Run enrollment first."
        )

    return joblib.load(MODEL_FILE)


# =====================================================
# 3. IDENTITY PREDICTION
# =====================================================


def recognize(embedding, model):

    prototypes = model["prototypes"]

    scores = {}

    # Ensure the query embedding is normalized.
    embedding = np.asarray(embedding, dtype=np.float32)
    embedding = embedding / (np.linalg.norm(embedding) + 1e-10)

    for person, prototype in prototypes.items():

        prototype = np.asarray(prototype, dtype=np.float32)
        prototype = prototype / (np.linalg.norm(prototype) + 1e-10)

        scores[person] = float(np.dot(embedding, prototype))

    ranked = sorted(
        scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    best_name, best_score = ranked[0]
    second_name, second_score = ranked[1]

    threshold = model["threshold"]
    margin = model["margin"]

    difference = best_score - second_score

    if best_score < threshold or difference < margin:
        return "UNKNOWN", best_score

    return best_name, best_score



# =====================================================
# 4. BYTE TRACKER
# =====================================================

def create_tracker(fps):
    yolo_path = MODEL_DIR / "yolo11n.pt"
    if yolo_path.exists():
        return YOLO(str(yolo_path))
    return YOLO("yolo11n.pt")


# =====================================================
# 5. VIDEO / WEBCAM RECOGNITION
# =====================================================


def run_recognition(source, model, save_video=False):

    cap = cv2.VideoCapture(source)

    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video source: {source}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not np.isfinite(fps) or fps <= 0:
        fps = 30

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    tracker = create_tracker(fps)

    frame_number = 0
    track_states = {}

    writer = None
    output_path = None

    if save_video:
        output_path = (
            OUTPUT_DIR /
            f"recognized_{datetime.now():%Y%m%d_%H%M%S}.mp4"
        )

        writer = cv2.VideoWriter(
            str(output_path),
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            (width, height)
        )

    print("\nRecognition started.")
    print("Press Q to stop.")

    while True:

        ret, frame = cap.read()

        if not ret:
            break

        # YOLO person detection + ByteTrack
        results = tracker.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            classes=[0],
            conf=0.25,
            verbose=False,
            device=0 if DEVICE.type == "cuda" else "cpu"
        )

        result = results[0]

        if result.boxes is not None and result.boxes.id is not None:

            person_boxes = result.boxes.xyxy.cpu().numpy()
            track_ids = result.boxes.id.int().cpu().numpy()

            for person_box, track_id in zip(person_boxes, track_ids):

                px1, py1, px2, py2 = map(int, person_box)

                # Crop tracked person
                person_crop = frame[
                    max(0, py1):min(height, py2),
                    max(0, px1):min(width, px2)
                ]

                if person_crop.size == 0:
                    continue

                # Detect face inside person crop
                image, boxes, probabilities = detect_faces(person_crop)

                if not boxes:
                    continue

                # Select largest face
                index = max(
                    range(len(boxes)),
                    key=lambda i: (
                        (boxes[i][2] - boxes[i][0]) *
                        (boxes[i][3] - boxes[i][1])
                    )
                )

                face_box = boxes[index]

                # Extract FaceNet embedding
                embeddings = extract_embeddings(
                    image,
                    [face_box]
                )

                if embeddings is None:
                    continue

                embedding = embeddings[0]

                track_id = int(track_id)

                if track_id not in track_states:
                    track_states[track_id] = {
                        "sum": np.zeros_like(embedding),
                        "count": 0,
                        "label": "UNKNOWN",
                        "score": 0.0
                    }

                state = track_states[track_id]

                state["sum"] += embedding
                state["count"] += 1

                average = state["sum"] / (
                    np.linalg.norm(state["sum"]) + 1e-10
                )

                name, score = recognize(average, model)

                """  temp    """
                # tempary for scoreing test 
                
                if state["count"] % 15 == 0:

                    scores = {
                        name: round(float(np.dot(
                            average,
                            prototype
                        )), 3)
                        for name, prototype in model["prototypes"].items()
                    }

                    print(
                        f"Track {track_id} | "
                        f"Prediction: {label} | "
                        f"Scores: {scores}"
                    )


                state["label"] = name
                state["score"] = score

                # Face coordinates relative to original frame
                x1, y1, x2, y2 = map(int, face_box)

                x1 += px1
                x2 += px1
                y1 += py1
                y2 += py1

                color = (
                    (0, 255, 0)
                    if name != "UNKNOWN"
                    else (0, 165, 255)
                )

                cv2.rectangle(
                    frame,
                    (x1, y1),
                    (x2, y2),
                    color,
                    2
                )

                label = (
                    f"{name} | {score:.2f} | ID {track_id}"
                )

                cv2.putText(
                    frame,
                    label,
                    (x1, max(20, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    color,
                    2
                )

        cv2.putText(
            frame,
            f"Frame: {frame_number}",
            (15, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )

        cv2.imshow(
            "FaceNet V2.1 Recognition",
            frame
        )

        if writer is not None:
            writer.write(frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

        frame_number += 1

    cap.release()

    if writer is not None:
        writer.release()

    cv2.destroyAllWindows()

    print("\nRecognition stopped.")

    if output_path:
        print("Saved:", output_path)


# =====================================================
# 6. PROCESS ALL MIXED VIDEOS
# =====================================================

def process_mixed_videos():

    model = load_model()

    videos = [
        p for p in MIXED_DIR.iterdir()
        if p.suffix.lower() in
        [".mp4", ".avi", ".mov", ".mkv"]
    ]

    if not videos:
        raise FileNotFoundError(
            f"No mixed videos found in {MIXED_DIR}"
        )

    for video in videos:

        print("\nProcessing:", video.name)

        run_recognition(
            str(video),
            model,
            save_video=True
        )


# =====================================================
# 7. COMMAND LINE INTERFACE
# =====================================================

def main():

    parser = argparse.ArgumentParser(
        description="FaceNet V2.1 Automatic Face Recognition"
    )

    parser.add_argument(
        "mode",
        choices=["enroll", "video", "webcam"]
    )

    parser.add_argument(
        "--source",
        type=str,
        default=None
    )

    args = parser.parse_args()

    if args.mode == "enroll":

        enroll()

    elif args.mode == "video":

        if args.source:
            source = args.source
        else:
            source = MIXED_DIR

        if Path(source).is_dir():

            videos = [
                p for p in Path(source).iterdir()
                if p.suffix.lower() in
                [".mp4", ".avi", ".mov", ".mkv"]
            ]

            if not videos:
                raise FileNotFoundError(
                    "No videos found in source directory."
                )

            model = load_model()

            for video in videos:

                run_recognition(
                    str(video),
                    model,
                    save_video=True
                )

        else:

            model = load_model()

            run_recognition(
                source,
                model,
                save_video=True
            )

    elif args.mode == "webcam":

        model = load_model()

        camera_index = (
            int(args.source) if args.source else 0
        )

        run_recognition(
            camera_index,
            model,
            save_video=False
        )


if __name__ == "__main__":

    main()
# python facenet_v2.py enroll
# python facenet_v2.py video
# python facenet_v2.py webcam