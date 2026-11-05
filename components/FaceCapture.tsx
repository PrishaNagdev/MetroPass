"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Aperture, RotateCcw, AlertTriangle, Upload, ScanFace, CheckCircle2, Sparkles, Zap } from "lucide-react";

type Props = { photoUrl: string | null; onCapture: (blob: Blob, url: string) => void; onClear: () => void };

function cameraError(e: unknown): string {
  const name = (e as DOMException)?.name;
  if (!window.isSecureContext) return "Camera needs a secure connection (HTTPS or localhost).";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera access was denied. Allow camera permission in your browser's address bar, then press Start Camera again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  if (name === "NotReadableError") return "Another app is using the camera. Close it and try again.";
  return "The camera could not be started.";
}

function playShutterSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

export default function FaceCapture({ photoUrl, onCapture, onClear }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-capture states
  const [autoCapture, setAutoCapture] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
    setCountdown(null);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not support camera access. Upload a clear selfie instead.");
      return;
    }
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch (e) {
      setError(cameraError(e));
    } finally {
      setStarting(false);
    }
  }, []);

  // Auto-start camera when booking component loads
  useEffect(() => {
    if (!photoUrl && !active) {
      start();
    }
  }, [photoUrl, active, start]);

  const capture = useCallback(() => {
    const v = videoRef.current,
      c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;

    // Trigger visual shutter flash
    setFlash(true);
    playShutterSound();
    setTimeout(() => setFlash(false), 200);

    // Crop strictly to the centered guideline box (54% width, 72% height)
    const boxRatioW = 0.54;
    const boxRatioH = 0.72;
    const cropW = Math.round(v.videoWidth * boxRatioW);
    const cropH = Math.round(v.videoHeight * boxRatioH);
    const cropX = Math.round((v.videoWidth - cropW) / 2);
    const cropY = Math.round((v.videoHeight - cropH) / 2);

    c.width = cropW;
    c.height = cropH;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // Flip horizontally to match mirrored user preview
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);

    // Draw only the centered bounding region
    ctx.drawImage(v, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    c.toBlob((blob) => {
      if (!blob) return setError("Could not capture the photo. Please try again.");
      onCapture(blob, URL.createObjectURL(blob));
      stop();
    }, "image/jpeg", 0.95);
  }, [onCapture, stop]);

  // Auto-capture countdown loop when active & camera is streaming (5 seconds)
  useEffect(() => {
    if (!active || photoUrl || !autoCapture) {
      setCountdown(null);
      return;
    }

    // Initialize 5 second countdown for steady facial alignment
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return 5;
        if (prev <= 1) {
          clearInterval(interval);
          capture();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [active, photoUrl, autoCapture, capture]);

  const retake = () => {
    onClear();
    start();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setError(null);
      const img = new Image();
      img.onload = () => {
        const c = canvasRef.current;
        if (!c) {
          onCapture(f, URL.createObjectURL(f));
          return;
        }
        const cropW = Math.round(img.naturalWidth * 0.6);
        const cropH = Math.round(img.naturalHeight * 0.75);
        const cropX = Math.round((img.naturalWidth - cropW) / 2);
        const cropY = Math.round((img.naturalHeight - cropH) / 2);
        c.width = cropW;
        c.height = cropH;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          c.toBlob((blob) => {
            if (blob) {
              onCapture(blob, URL.createObjectURL(blob));
            } else {
              onCapture(f, URL.createObjectURL(f));
            }
          }, "image/jpeg", 0.95);
        } else {
          onCapture(f, URL.createObjectURL(f));
        }
      };
      img.src = URL.createObjectURL(f);
    }
    e.target.value = "";
  };

  const btn =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="flex gap-3 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-2">
            <p>{error}</p>
            <label className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-red-800 underline underline-offset-2">
              <Upload className="h-3.5 w-3.5" /> Upload a photo instead
              <input type="file" accept="image/*" capture="user" className="sr-only" onChange={onFile} />
            </label>
          </div>
        </div>
      )}

      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
        {/* Shutter flash animation overlay */}
        {flash && <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200" />}

        {photoUrl ? (
          <div className="relative h-full w-full bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Captured centered face snapshot" className="h-full w-full object-contain" />
            <div className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-2 rounded-lg bg-slate-900/85 px-3 py-1.5 text-xs font-medium text-emerald-400 backdrop-blur-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Face cropped for biometric turnstile matching</span>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full -scale-x-100 object-cover ${active ? "" : "invisible"}`}
            />
            {!active && (
              <div className="absolute inset-0 grid place-items-center text-center text-slate-400 p-4">
                <div className="space-y-3">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-800/80 text-brand">
                    <ScanFace className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Turnstile Facial Registration</p>
                    <p className="text-xs text-slate-400 mt-1">Starting camera for hands-free auto-capture...</p>
                  </div>
                  <button
                    onClick={start}
                    disabled={starting}
                    className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow hover:bg-brand-dark transition"
                  >
                    {starting ? "Starting Camera..." : "Click to Enable Camera"}
                  </button>
                </div>
              </div>
            )}

            {/* Face Positioning Overlay on Camera */}
            {active && (
              <div className="pointer-events-none absolute inset-0">
                {/* Centered guideline box with darkened mask around it */}
                <div className="absolute left-1/2 top-1/2 h-[72%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-brand/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]">
                  {/* Viewfinder corner brackets */}
                  <span className="absolute -left-1 -top-1 h-5 w-5 border-l-4 border-t-4 border-brand rounded-tl-sm" />
                  <span className="absolute -right-1 -top-1 h-5 w-5 border-r-4 border-t-4 border-brand rounded-tr-sm" />
                  <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-brand rounded-bl-sm" />
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-brand rounded-br-sm" />

                  {/* Animated laser scan line inside the box */}
                  <div className="absolute inset-x-2 h-0.5 animate-scan bg-gradient-to-r from-transparent via-brand to-transparent opacity-85 shadow-[0_0_8px_rgba(244,113,63,0.8)]" />

                  {/* Crosshair guides in center */}
                  <div className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-white/40" />
                  <div className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-white/40" />

                  {/* Center Hands-Free Countdown Indicator */}
                  {autoCapture && countdown !== null && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                      <div className="relative grid h-16 w-16 place-items-center rounded-full bg-brand/90 text-white font-extrabold text-2xl shadow-2xl border-2 border-white animate-scale-pulse">
                        <span>{countdown}</span>
                      </div>
                      <span className="mt-2.5 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-bold text-white tracking-wide border border-brand/40 shadow-lg">
                        Hold still • Auto-capturing
                      </span>
                    </div>
                  )}
                </div>

                {/* Clear guideline label */}
                <div className="absolute bottom-3 left-0 right-0 text-center px-4">
                  <span className="inline-block rounded-full bg-slate-900/90 px-4 py-1.5 text-xs font-semibold text-white shadow-md border border-brand/40">
                    Align your face inside the box
                  </span>
                  <p className="mt-1 text-[11px] font-medium text-slate-300 drop-shadow">
                    Hands-free: will snap automatically in 5 seconds
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!photoUrl && !active && (
            <button onClick={start} disabled={starting} className={`${btn} bg-slate-100 text-slate-800 hover:bg-slate-200`}>
              <Camera className="h-4 w-4" /> {starting ? "Starting…" : "Start Camera"}
            </button>
          )}

          {!photoUrl && active && (
            <button
              onClick={capture}
              className={`${btn} bg-brand text-white hover:bg-brand-dark shadow-sm font-semibold`}
            >
              <Aperture className="h-4 w-4" /> Capture Now
            </button>
          )}

          {photoUrl && (
            <button onClick={retake} className={`${btn} bg-slate-100 text-slate-800 hover:bg-slate-200 font-semibold`}>
              <RotateCcw className="h-4 w-4" /> Retake Photo
            </button>
          )}

          {/* Auto-Capture Toggle */}
          {!photoUrl && active && (
            <button
              type="button"
              onClick={() => setAutoCapture(!autoCapture)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition border ${
                autoCapture
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              <Zap className={`h-3.5 w-3.5 ${autoCapture ? "text-emerald-600 fill-emerald-600" : "text-slate-400"}`} />
              Auto-Capture: {autoCapture ? "ON" : "OFF"}
            </button>
          )}
        </div>

        {!photoUrl && !active && (
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand underline underline-offset-2">
            <Upload className="h-3.5 w-3.5" /> Upload photo
            <input type="file" accept="image/*" className="sr-only" onChange={onFile} />
          </label>
        )}
      </div>
    </div>
  );
}
