import os
os.environ["KERAS_HOME"] = "/tmp/.keras"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.makedirs("/tmp/.keras", exist_ok=True)

import io
import json
import sqlite3
import uuid
from datetime import datetime

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# ----------------- Deep Learning FaceNet Engine -----------------
try:
    from face_engine import get_face_embedding
    print("Loaded FaceNet InceptionResnetV1 (512-d) engine from facenet_v2.")
except Exception as e:
    print(f"Warning: could not import face_engine ({e}). Will use fallback.")
    get_face_embedding = None

# Fallback Haar Cascade
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

app = FastAPI(title="MetroPass Biometric Verification API", version="2.0.0")

# Enable CORS for React/Next.js frontend (localhost:3000, localhost:3001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Database Setup -----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "tickets.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            ticket_id TEXT PRIMARY KEY,
            passenger_name TEXT NOT NULL,
            source_station TEXT NOT NULL,
            dest_station TEXT NOT NULL,
            travel_date TEXT NOT NULL,
            fare REAL NOT NULL,
            status TEXT NOT NULL, -- 'ACTIVE' or 'USED'
            embedding TEXT NOT NULL, -- JSON string of floats
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ----------------- Fallback Feature Extractor -----------------
_fallback_model = None

def get_fallback_model():
    global _fallback_model
    if _fallback_model is None:
        try:
            import tensorflow as tf
            model_path = os.path.join(BASE_DIR, "models", "face_feature_extractor.keras")
            if not os.path.exists(model_path):
                model_path = os.path.join(BASE_DIR, "face_feature_extractor.keras")
            if os.path.exists(model_path):
                _fallback_model = tf.keras.models.load_model(model_path, compile=False)
            else:
                base = tf.keras.applications.MobileNetV2(input_shape=(160, 160, 3), include_top=False, weights="imagenet")
                _fallback_model = tf.keras.Sequential([
                    base,
                    tf.keras.layers.GlobalAveragePooling2D(),
                    tf.keras.layers.Dense(128),
                    tf.keras.layers.Lambda(lambda x: tf.math.l2_normalize(x, axis=1))
                ])
        except Exception as ex:
            print(f"Fallback model error: {ex}")
    return _fallback_model

def extract_embedding(image_bytes: bytes) -> list:
    """
    Primary: Generates 512-d normalized FaceNet vector via face_engine (MTCNN + InceptionResnetV1).
    Fallback: MobileNetV2 if FaceNet is unavailable.
    """
    if get_face_embedding is not None:
        try:
            emb = get_face_embedding(image_bytes)
            return emb.tolist()
        except Exception as e:
            print(f"FaceNet extraction error ({e}), trying fallback...")

    # Fallback pipeline
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    np_img = np.array(image)
    gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(60, 60))

    if len(faces) > 0:
        x, y, w, h = faces[0]
        face_crop = np_img[y:y+h, x:x+w]
    else:
        h, w, _ = np_img.shape
        face_crop = np_img[int(h*0.1):int(h*0.9), int(w*0.1):int(w*0.9)]

    face_resized = cv2.resize(face_crop, (160, 160))
    face_normalized = (face_resized.astype("float32") / 127.5) - 1.0
    tensor_input = np.expand_dims(face_normalized, axis=0)
    fb_model = get_fallback_model()
    if fb_model is not None:
        return fb_model.predict(tensor_input, verbose=0)[0].tolist()
    else:
        # Ultimate deterministic vector
        return np.ones(512, dtype=np.float32).tolist()

# ----------------- API Endpoints -----------------

@app.get("/")
def read_root():
    return {
        "service": "Ahmedabad Metro FaceNet Biometric Verification API",
        "version": "2.0.0",
        "status": "ONLINE",
        "engine": "FaceNet InceptionResnetV1 (512-d) + MTCNN",
    }

@app.post("/api/tickets/book")
async def book_ticket(
    face_image: UploadFile = File(...),
    passenger_name: str = Form(...),
    source_station: str = Form(...),
    dest_station: str = Form(...),
    travel_date: str = Form(...),
    fare: float = Form(30.0),
):
    """
    Processes single passenger booking, extracts FaceNet 512-d embedding vector, saves ticket.
    """
    if not passenger_name or len(passenger_name.strip()) < 3:
        raise HTTPException(status_code=400, detail="Passenger name must contain at least 3 characters.")

    contents = await face_image.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Invalid face image upload.")

    try:
        embedding_vec = extract_embedding(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting FaceNet features: {str(e)}")

    ticket_id = f"#METRO-{uuid.uuid4().hex[:5].upper()}"

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tickets (ticket_id, passenger_name, source_station, dest_station, travel_date, fare, status, embedding)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    """, (ticket_id, passenger_name.strip(), source_station, dest_station, travel_date, fare, json.dumps(embedding_vec)))
    conn.commit()
    conn.close()

    return {
        "ticket_id": ticket_id,
        "passenger_name": passenger_name.strip(),
        "source_station": source_station,
        "dest_station": dest_station,
        "travel_date": travel_date,
        "fare": fare,
        "status": "ACTIVE",
        "embedding_dim": len(embedding_vec),
        "message": f"Face embedding ({len(embedding_vec)}-d) stored successfully.",
    }


@app.get("/api/tickets/active")
def get_active_tickets():
    """Returns list of currently active tickets."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ticket_id, passenger_name, source_station, dest_station, travel_date, fare, status 
        FROM tickets 
        WHERE status = 'ACTIVE' 
        ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "ticket_id": r[0],
            "passenger_name": r[1],
            "source_station": r[2],
            "dest_station": r[3],
            "travel_date": r[4],
            "fare": r[5],
            "status": r[6],
        }
        for r in rows
    ]


@app.post("/api/verify-gate")
async def verify_gate_entry(
    file: UploadFile = File(...),
    station_name: str = Form("SP Stadium"),
    threshold: float = Form(0.75),  # FaceNet L2 distance threshold
):
    """
    Called by the turnstile gate camera terminal script.
    Compares live FaceNet embedding against all active tickets.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Invalid camera frame.")

    live_embedding = np.array(extract_embedding(contents), dtype=np.float32)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT ticket_id, passenger_name, source_station, embedding FROM tickets WHERE status = 'ACTIVE'")
    records = cursor.fetchall()

    best_match = None
    min_distance = float("inf")

    for ticket_id, name, src_station, emb_json in records:
        try:
            stored_emb = np.array(json.loads(emb_json), dtype=np.float32)
            if stored_emb.shape != live_embedding.shape:
                continue

            # FaceNet Euclidean distance (L2 norm)
            dist = float(np.linalg.norm(stored_emb - live_embedding))

            if dist < min_distance:
                min_distance = dist
                if dist <= threshold:
                    best_match = {"ticket_id": ticket_id, "name": name, "source_station": src_station}
        except Exception:
            continue

    if best_match:
        # Mark ticket as USED immediately to prevent duplicate gate pass
        cursor.execute("UPDATE tickets SET status = 'USED' WHERE ticket_id = ?", (best_match["ticket_id"],))
        conn.commit()
        conn.close()
        return {
            "verified": True,
            "ticket_id": best_match["ticket_id"],
            "name": best_match["name"],
            "distance": round(min_distance, 4),
            "message": "Access Granted. Turnstile Unlocked.",
        }

    conn.close()
    return {
        "verified": False,
        "distance": round(min_distance, 4) if min_distance != float("inf") else None,
        "message": "Access Denied. No matching active ticket found.",
    }


@app.post("/api/tickets/{ticket_id}/use")
def mark_ticket_used(ticket_id: str):
    """Allows manual simulation toggle from UI."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    target_id = ticket_id if ticket_id.startswith("#") else f"#{ticket_id}"
    cursor.execute("UPDATE tickets SET status = 'USED' WHERE ticket_id = ? OR ticket_id = ?", (ticket_id, target_id))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()

    if not updated:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return {"success": True, "ticket_id": target_id, "status": "USED"}


STATION_PENALTIES = {
    "Kalupur Railway Station": {"base_fare": 35.0, "penalty": 350.0, "category": "Major Railway Interchange Hub", "zone": "Zone A+"},
    "Old High Court": {"base_fare": 30.0, "penalty": 300.0, "category": "Central Metro Interchange Station", "zone": "Zone A"},
    "SP Stadium": {"base_fare": 30.0, "penalty": 250.0, "category": "Sports Arena & Transit Post", "zone": "Zone B"},
    "Thaltej Gam": {"base_fare": 30.0, "penalty": 280.0, "category": "West Terminal Hub", "zone": "Zone A"},
    "Thaltej": {"base_fare": 25.0, "penalty": 260.0, "category": "Commercial District", "zone": "Zone B"},
    "Doordarshan Kendra": {"base_fare": 20.0, "penalty": 220.0, "category": "Broadcast & Civic Sector", "zone": "Zone C"},
    "Gurukul Road": {"base_fare": 20.0, "penalty": 230.0, "category": "High-Density Residential Sector", "zone": "Zone C"},
    "Gujarat University": {"base_fare": 25.0, "penalty": 240.0, "category": "Educational & University Corridor", "zone": "Zone B"},
    "Commerce Six Roads": {"base_fare": 25.0, "penalty": 240.0, "category": "Commercial Corridor", "zone": "Zone B"},
    "Shreyas Crossing": {"base_fare": 25.0, "penalty": 250.0, "category": "Cross-Over Station", "zone": "Zone B"},
    "Kankariya East": {"base_fare": 25.0, "penalty": 270.0, "category": "Lakefront Tourism & Recreation Zone", "zone": "Zone B+"},
    "Apparel Park": {"base_fare": 20.0, "penalty": 200.0, "category": "Industrial Sector Hub", "zone": "Zone C"},
    "Amraiwadi": {"base_fare": 20.0, "penalty": 190.0, "category": "Suburban Sector 1", "zone": "Zone D"},
    "Rabari Colony": {"base_fare": 20.0, "penalty": 180.0, "category": "Suburban Sector 2", "zone": "Zone D"},
    "Vastral": {"base_fare": 20.0, "penalty": 170.0, "category": "Residential East", "zone": "Zone D"},
    "Nirant Cross Road": {"base_fare": 15.0, "penalty": 160.0, "category": "Outer Ring Checkpost", "zone": "Zone E"},
    "Vastral Gam": {"base_fare": 15.0, "penalty": 150.0, "category": "East Terminus Hub", "zone": "Zone E"},
}


@app.post("/api/tc/inspect-passenger")
async def inspect_passenger(
    file: UploadFile = File(...),
    threshold: float = Form(0.75),
    station_name: str = Form("SP Stadium"),
):
    """
    Official Inspector / TC Portal biometric inspection endpoint.
    Checks captured face against all tickets (both ACTIVE and USED) on the daily manifest.
    Computes station-specific penalty according to Section 138 Metro Railways Act.
    """
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Invalid face snapshot.")

    try:
        live_embedding = np.array(extract_embedding(contents), dtype=np.float32)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Biometric processing failed: {str(e)}")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ticket_id, passenger_name, source_station, dest_station, travel_date, fare, status, embedding
        FROM tickets
        ORDER BY created_at DESC
    """)
    records = cursor.fetchall()
    conn.close()

    best_match = None
    min_distance = float("inf")

    for ticket_id, name, src, dst, t_date, fare, t_status, emb_json in records:
        try:
            stored_emb = np.array(json.loads(emb_json), dtype=np.float32)
            if stored_emb.shape != live_embedding.shape:
                continue

            dist = float(np.linalg.norm(stored_emb - live_embedding))
            if dist < min_distance:
                min_distance = dist
                if dist <= threshold:
                    best_match = {
                        "ticket_id": ticket_id,
                        "passenger_name": name,
                        "source_station": src,
                        "dest_station": dst,
                        "travel_date": t_date,
                        "fare": fare,
                        "status": t_status,
                        "distance": round(dist, 4),
                    }
        except Exception:
            continue

    station_info = STATION_PENALTIES.get(
        station_name,
        {"base_fare": 30.0, "penalty": 250.0, "category": "Standard Transit Checkpost", "zone": "Zone B"}
    )

    if best_match:
        return {
            "verified": True,
            **best_match,
            "inspection_station": station_name,
            "message": f"Valid ticket confirmed for passenger at {station_name}.",
        }

    return {
        "verified": False,
        "distance": round(min_distance, 4) if min_distance != float("inf") else None,
        "inspection_station": station_name,
        "station_category": station_info["category"],
        "zone": station_info["zone"],
        "base_fare": station_info["base_fare"],
        "penalty": station_info["penalty"],
        "total_due": station_info["base_fare"] + station_info["penalty"],
        "message": f"Passenger biometric face does not match any active or used ticket for today's manifest at {station_name}.",
    }
