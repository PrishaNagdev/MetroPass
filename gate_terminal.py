import cv2
import requests
import time
import numpy as np

# API Configuration
GATE_ENDPOINT = "http://localhost:8000/api/verify-gate"
STATION_NAME = "SP Stadium"
VERIFY_COOLDOWN = 2.0  # seconds between validation attempts

# Initialize Camera
cap = cv2.VideoCapture(0)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# Runtime States
last_scan_time = 0
gate_status = "IDLE"  # "IDLE", "GRANTED", "DENIED"
status_display_text = "STAND IN FRONT OF GATE CAMERA"
sub_display_text = f"Terminal Gate: {STATION_NAME}"
box_color = (255, 200, 0)  # Yellow/Cyan default
reset_timer = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    height, width, _ = frame.shape
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=5, minSize=(140, 140))

    current_time = time.time()

    # Reset visual state back to IDLE after 3.5 seconds of a decision
    if gate_status != "IDLE" and (current_time - reset_timer > 3.5):
        gate_status = "IDLE"
        status_display_text = "STAND IN FRONT OF GATE CAMERA"
        sub_display_text = f"Terminal Gate: {STATION_NAME}"
        box_color = (255, 200, 0)

    # Face scanning loop
    for (x, y, w, h) in faces:
        if gate_status == "IDLE" and (current_time - last_scan_time > VERIFY_COOLDOWN):
            last_scan_time = current_time
            
            # Crop detected face region
            face_roi = frame[y:y+h, x:x+w]
            success, buffer = cv2.imencode(".jpg", face_roi)
            
            if success:
                try:
                    files = {"file": ("gate_scan.jpg", buffer.tobytes(), "image/jpeg")}
                    data = {"station_name": STATION_NAME}
                    
                    response = requests.post(GATE_ENDPOINT, files=files, data=data, timeout=3.0)
                    result = response.json()

                    if result.get("verified"):
                        gate_status = "GRANTED"
                        passenger = result.get("name", "Passenger")
                        ticket_no = result.get("ticket_id", "")
                        dist = result.get("distance", 0.0)
                        status_display_text = f"ENTRY ALLOWED: {passenger}"
                        sub_display_text = f"Ticket {ticket_no} | L2 Dist: {dist}"
                        box_color = (0, 255, 0)  # Green
                        reset_timer = current_time
                    else:
                        gate_status = "DENIED"
                        dist = result.get("distance", "N/A")
                        status_display_text = "ACCESS DENIED - NO ACTIVE TICKET"
                        sub_display_text = f"Face Mismatch / Already Used | Dist: {dist}"
                        box_color = (0, 0, 255)  # Red
                        reset_timer = current_time
                except requests.exceptions.RequestException as e:
                    status_display_text = "BACKEND CONNECTION ERROR"
                    sub_display_text = "Check if FastAPI is running on port 8000"
                    box_color = (0, 140, 255)

        # Draw Target Reticle around face
        cv2.rectangle(frame, (x, y), (x + w, y + h), box_color, 2)
        # Reticle corner accents
        line_len = int(w * 0.15)
        cv2.line(frame, (x, y), (x + line_len, y), box_color, 4)
        cv2.line(frame, (x, y), (x, y + line_len), box_color, 4)
        cv2.line(frame, (x + w, y), (x + w - line_len, y), box_color, 4)
        cv2.line(frame, (x + w, y), (x + w, y + line_len), box_color, 4)
        cv2.line(frame, (x, y + h), (x + line_len, y + h), box_color, 4)
        cv2.line(frame, (x, y + h), (x, y + h - line_len), box_color, 4)
        cv2.line(frame, (x + w, y + h), (x + w - line_len, y + h), box_color, 4)
        cv2.line(frame, (x + w, y + h), (x + w, y + h - line_len), box_color, 4)

    # Top Status Banner Overlay
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (width, 85), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

    # Dynamic Gate Status Text
    cv2.putText(frame, status_display_text, (25, 38), cv2.FONT_HERSHEY_DUPLEX, 0.85, box_color, 2)
    cv2.putText(frame, sub_display_text, (25, 68), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)

    # System Status Indicator
    cv2.circle(frame, (width - 40, 42), 8, (0, 255, 0) if gate_status != "DENIED" else (0, 0, 255), -1)

    cv2.imshow("Ahmedabad Metro - Turnstile Gate Simulator", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
