"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, FastForward } from "lucide-react";

type Props = {
  onComplete: () => void;
};

export default function IntroSplash({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  // Smoothly finish intro and transition to website
  const finish = () => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      onComplete();
    }, 600); // 600ms exit fade transition
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Start video playback automatically
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback for strict browser autoplay policies: ensure muted and play
        video.muted = true;
        setMuted(true);
        video.play().catch(() => {});
      });
    }

    // Safety timeout in case video fails or gets stuck
    const safetyTimer = setTimeout(() => {
      finish();
    }, 7500);

    return () => clearTimeout(safetyTimer);
  }, []);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (v && v.duration) {
      setProgress((v.currentTime / v.duration) * 100);
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (v) {
      const next = !muted;
      v.muted = next;
      setMuted(next);
    }
  };

  return (
    <div
      onClick={finish}
      className={`fixed inset-0 z-[9999] h-screen w-screen overflow-hidden bg-black transition-all duration-700 ease-in-out select-none cursor-pointer ${
        fading ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Full-Screen Video Background */}
      <video
        ref={videoRef}
        src="/Logo_DL_.mp4"
        playsInline
        autoPlay
        muted={muted}
        onEnded={finish}
        onTimeUpdate={handleTimeUpdate}
        className="absolute inset-0 h-full w-full object-cover sm:object-contain bg-black"
      />

      {/* Floating Top Header: Ahmedabad Metro Logo & Skip Button */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-6 sm:px-10 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ahmedabad Metro" className="h-11 w-auto object-contain bg-white rounded-lg p-0.5 shadow-xl" />
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-wider text-white drop-shadow-md leading-none">
              AHMEDABAD <span className="text-brand">METRO</span>
            </span>
            <span className="text-[11px] font-bold text-orange-200 uppercase tracking-widest mt-0.5 drop-shadow">
              MetroPass • આપણી મેટ્રો
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
          className="group pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/60 px-5 py-2.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-brand hover:text-white border border-white/20 shadow-2xl"
        >
          <span>Skip Intro</span>
          <FastForward className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Floating Bottom Bar: Biometric Tag, Sound Toggle, and Screen Progress */}
      <div className="absolute bottom-0 inset-x-0 z-30 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none pb-4 pt-12">
        <div className="flex items-center justify-between px-6 sm:px-10 pb-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium drop-shadow">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Deep Learning Biometric Turnstile System</span>
            <span className="sm:hidden">Biometrics</span>
          </div>

          <div className="pointer-events-auto flex items-center gap-3">
            <button
              onClick={toggleSound}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-1.5 text-xs font-semibold text-white/90 hover:text-white hover:bg-black/80 transition backdrop-blur-md border border-white/20 shadow-lg"
            >
              {muted ? (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-brand" />
                  <span>Mute</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full-width Edge-to-Edge Progress Bar */}
        <div className="relative h-1.5 w-full bg-white/20">
          <div
            className="h-full bg-gradient-to-r from-brand via-amber-400 to-brand transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(244,113,63,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
