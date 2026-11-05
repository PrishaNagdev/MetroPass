"use client";
import { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeftRight,
  Train,
  ShieldCheck,
  Ticket as TicketIcon,
  QrCode,
  MapPin,
  Clock3,
  Map,
  Route,
  IndianRupee,
  Cpu,
  Zap,
  CheckCircle2,
  ScanFace,
  ChevronDown,
  X,
  Radio,
  FileCheck2,
  Activity,
  Layers,
} from "lucide-react";
import { EW_STATIONS, getJourneyDetails } from "@/lib/stations";
import { Tab } from "@/components/Header";

// ============================================================================
// Interactive Spotlight Glass Card (Tracks cursor and casts ambient light)
// ============================================================================
type SpotlightGlassCardProps = {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightRadius?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
};

function SpotlightGlassCard({
  children,
  className = "",
  spotlightColor = "rgba(255, 255, 255, 0.35)",
  spotlightRadius = 380,
  onClick,
  style,
}: SpotlightGlassCardProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPos(null);
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      style={style}
      className={`relative overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Dynamic Cursor Spotlight Light */}
      {hovered && pos && (
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-200 z-1"
          style={{
            background: `radial-gradient(${spotlightRadius}px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 80%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

// ============================================================================
// Interactive Spotlight Button (Cursor-following gleam on buttons)
// ============================================================================
function SpotlightButton({
  children,
  className = "",
  spotlightColor = "rgba(255, 255, 255, 0.5)",
  onClick,
  type = "button",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  onClick?: (e: React.MouseEvent) => void;
  type?: "button" | "submit";
  title?: string;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPos(null);
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      className={`relative overflow-hidden transition-all duration-300 ${className}`}
    >
      {hovered && pos && (
        <span
          className="pointer-events-none absolute -inset-px z-1 transition-opacity duration-150"
          style={{
            background: `radial-gradient(180px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 75%)`,
          }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2 w-full">
        {children}
      </span>
    </button>
  );
}

// Animated speed countdown hook (counts down to target e.g. 0.38s)
function useAnimatedSpeed(target = 0.38, duration = 1400) {
  const [speed, setSpeed] = useState(1.2);

  useEffect(() => {
    let start: number | null = null;
    let frame: number;

    const animate = (time: number) => {
      if (!start) start = time;
      const progress = Math.min((time - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setSpeed(1.2 - ease * (1.2 - target));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return speed;
}

type Props = {
  onBookJourney: (origin: string, destination: string) => void;
  onNavigate: (tab: Tab) => void;
  activeCount: number;
};

export default function LandingHome({ onBookJourney, onNavigate, activeCount }: Props) {
  const [origin, setOrigin] = useState<string>("Vastral Gam");
  const [dest, setDest] = useState<string>("Thaltej Gam");
  const [swapAnim, setSwapAnim] = useState(false);
  const [modal, setModal] = useState<"map" | "timetable" | null>(null);
  const [gateStatus, setGateStatus] = useState<"IDLE" | "SCANNING" | "OPEN">("OPEN");

  // Animated speed counter for gate simulator
  const speedCount = useAnimatedSpeed(0.38, 1400);

  const handleSimulateGate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setGateStatus("SCANNING");
    setTimeout(() => {
      setGateStatus("OPEN");
    }, 1200);
  };

  // Quick live journey estimate on the hero search bar
  const quickEst = useMemo(() => {
    if (!origin || !dest || origin === dest) return null;
    return getJourneyDetails(origin, dest);
  }, [origin, dest]);

  const handleSwap = () => {
    setSwapAnim(true);
    setTimeout(() => setSwapAnim(false), 300);
    const tmp = origin;
    setOrigin(dest);
    setDest(tmp);
  };

  const handleHeroBook = () => {
    if (!origin || !dest || origin === dest) {
      onNavigate("book");
      return;
    }
    onBookJourney(origin, dest);
  };

  return (
    <div className="relative min-h-[90vh] overflow-hidden bg-slate-50/70 pb-24">
      {/* Subtle radial gradient mesh background (light subtle slate/orange gradient, not stark white) */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[560px] w-[950px] rounded-full bg-gradient-to-tr from-orange-400/20 via-amber-300/15 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute top-96 -left-32 h-[500px] w-[550px] rounded-full bg-orange-300/15 blur-3xl" />
      <div className="pointer-events-none absolute top-[700px] -right-32 h-[500px] w-[550px] rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10 space-y-14">
        {/* ============================================================ */}
        {/* 2. ANIMATED HERO SECTION */}
        {/* ============================================================ */}
        <section className="text-center space-y-6">
          {/* Official Ahmedabad Metro Logo Card & Animated Badge */}
          <div className="flex flex-col items-center justify-center gap-3.5">
            <div className="inline-flex items-center gap-3.5 rounded-2xl bg-white/95 px-5 py-2.5 shadow-md border border-orange-200/90 backdrop-blur-xl transition-all hover:scale-105 hover:shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Ahmedabad Metro - આપણી મેટ્રો"
                className="h-12 sm:h-14 w-auto object-contain drop-shadow-xs"
              />
              <div className="text-left">
                <span className="block text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                  Ahmedabad Metro
                </span>
                <span className="block text-[11px] sm:text-xs font-bold text-[#F37021] tracking-wider uppercase">
                  આપણી મેટ્રો • Official Biometric Portal
                </span>
              </div>
            </div>

            {/* Animated Badge with embedded Logo */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#F37021] shadow-xs backdrop-blur-md transition-transform hover:scale-105">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Ahmedabad Metro Logo"
                className="h-4 w-auto object-contain rounded bg-white p-0.5 shadow-xs"
              />
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F37021]" />
              </span>
              <span>SMART CONTACTLESS TRANSIT • POWERED BY DEEP LEARNING</span>
            </div>
          </div>

          {/* Main Title */}
          <h1 className="mx-auto max-w-4xl text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            The Future of Transit:{" "}
            <span className="block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-[#F37021] via-orange-600 to-amber-600">
              Walk-Through Facial Ticketing
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
            Book your ticket, register your facial vector in seconds, and breeze through automated turnstile barriers without phones or paper.
          </p>

          {/* Quick Journey Search Bar (Enlarged Floating Glassmorphic Card with Cursor Spotlight) */}
          <div className="mx-auto max-w-5xl pt-4">
            <SpotlightGlassCard
              spotlightColor="rgba(243, 112, 33, 0.18)"
              spotlightRadius={480}
              className="rounded-[2.2rem] border border-white/90 bg-white/80 p-6 sm:p-7 shadow-2xl shadow-orange-500/10 backdrop-blur-2xl transition hover:shadow-orange-500/20 hover:border-orange-300/70"
            >
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                {/* Origin Dropdown */}
                <div className="md:col-span-4 relative text-left">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#F37021]" /> Origin Station
                  </label>
                  <div className="relative">
                    <select
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3.5 pr-9 text-sm sm:text-base font-bold text-slate-800 shadow-xs focus:border-[#F37021] focus:outline-none focus:ring-2 focus:ring-[#F37021]/30 transition"
                    >
                      {EW_STATIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Swap Button */}
                <div className="md:col-span-1 flex justify-center py-1 md:py-0">
                  <button
                    type="button"
                    onClick={handleSwap}
                    title="Swap Origin and Destination"
                    aria-label="Swap Stations"
                    className={`grid h-12 w-12 place-items-center rounded-full border border-slate-200/90 bg-white text-slate-700 shadow-md transition hover:bg-orange-50 hover:text-[#F37021] hover:border-orange-300 active:scale-90 ${
                      swapAnim ? "rotate-180" : ""
                    }`}
                  >
                    <ArrowLeftRight className="h-4.5 w-4.5 transition-transform duration-300" />
                  </button>
                </div>

                {/* Destination Dropdown */}
                <div className="md:col-span-4 relative text-left">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Destination Station
                  </label>
                  <div className="relative">
                    <select
                      value={dest}
                      onChange={(e) => setDest(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3.5 pr-9 text-sm sm:text-base font-bold text-slate-800 shadow-xs focus:border-[#F37021] focus:outline-none focus:ring-2 focus:ring-[#F37021]/30 transition"
                    >
                      {EW_STATIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* CTA Button: "Book Biometric Pass" with dynamic Cursor Light */}
                <div className="md:col-span-3 pt-2 md:pt-4">
                  <SpotlightButton
                    onClick={handleHeroBook}
                    spotlightColor="rgba(255, 255, 255, 0.55)"
                    className="w-full group rounded-2xl bg-gradient-to-r from-[#F37021] via-orange-600 to-[#E25F2D] px-4 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F37021]"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-12" />
                    <span className="truncate">Book Biometric Pass</span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                  </SpotlightButton>
                </div>
              </div>

              {/* Quick Route Meta Preview if valid */}
              {quickEst && (
                <div className="relative z-10 mt-4 pt-3.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                  <div className="flex items-center flex-wrap gap-2.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 border border-emerald-200/70 shadow-xs font-bold">
                      Fare: ₹{quickEst.fare}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 px-3 py-1 border border-blue-200/70 shadow-xs">
                      {quickEst.distanceText}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-800 px-3 py-1 border border-purple-200/70 shadow-xs">
                      {quickEst.stops} intermediate stops
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-800 px-3 py-1 border border-orange-200/70 shadow-xs">
                      Est. {quickEst.minutes} mins
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] hidden sm:inline font-semibold">
                    EW Line • Direct Rapid Transit
                  </span>
                </div>
              )}
            </SpotlightGlassCard>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 3. FEATURE SHOWCASE CARDS (Bento-style Glass Cards with Cursor Light) */}
        {/* ============================================================ */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-100/80 px-3 py-1 text-[11px] font-bold text-orange-800 uppercase tracking-wider mb-1.5 border border-orange-200/60 backdrop-blur-md">
                <Sparkles className="h-3 w-3 text-[#F37021]" />
                Next-Gen Biometrics • Seamless Commute
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Transit Services &amp; Biometric Tools
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Choose an action below to book, simulate gate verification, or access metro utilities.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* Bento Card 1: Book FacePass Ticket (Primary CTA Card with Dynamic Cursor Light) */}
            <SpotlightGlassCard
              onClick={() => onNavigate("book")}
              spotlightColor="rgba(255, 255, 255, 0.45)"
              spotlightRadius={450}
              className="group cursor-pointer md:col-span-1 lg:col-span-6 rounded-[2rem] bg-gradient-to-br from-[#F37021] via-orange-600 to-amber-600 p-7 sm:p-8 text-white shadow-2xl shadow-orange-500/20 border border-white/30 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-orange-500/40 hover:border-white/50 flex flex-col justify-between min-h-[340px]"
            >
              {/* Decorative background glow & shapes */}
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-52 w-52 rounded-full bg-white/10 blur-2xl group-hover:scale-125 transition-transform" />
              <div className="pointer-events-none absolute right-4 top-4 text-white/15">
                <Train className="h-32 w-32 -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0" />
              </div>

              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/25 shadow-xs">
                  <Sparkles className="h-3 w-3" />
                  Instant Booking (5-sec Face Capture)
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Book FacePass Ticket
                </h3>
                <p className="text-sm sm:text-base text-orange-100 max-w-md font-medium leading-relaxed">
                  Generate your 128-d / 512-d facial embedding directly from your camera or photo upload. Walk straight through metro barriers with zero physical paper.
                </p>
              </div>

              <div className="relative z-10 pt-6 flex items-center justify-between">
                <SpotlightButton
                  spotlightColor="rgba(243, 112, 33, 0.35)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate("book");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-md group-hover:bg-orange-50 transition-all hover:scale-105 active:scale-95"
                >
                  <span>Start Face Registration</span>
                  <ArrowRight className="h-4 w-4 text-[#F37021] group-hover:translate-x-1 transition-transform" />
                </SpotlightButton>
                <span className="text-xs font-bold text-orange-100 uppercase tracking-widest hidden sm:inline backdrop-blur-sm px-3 py-1 rounded-full bg-black/10 border border-white/20">
                  Contactless FacePass
                </span>
              </div>
            </SpotlightGlassCard>

            {/* Bento Card 2: Turnstile Biometric Gate (Animated Visual Scanline Effect & Emerald Light) */}
            <SpotlightGlassCard
              onClick={() => onNavigate("book")}
              spotlightColor="rgba(52, 211, 153, 0.28)"
              spotlightRadius={400}
              className="group cursor-pointer md:col-span-1 lg:col-span-6 rounded-[2rem] bg-slate-900/90 backdrop-blur-2xl p-7 text-white shadow-2xl border border-slate-700/60 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-500/60 hover:shadow-emerald-500/20 flex flex-col justify-between min-h-[340px]"
            >
              <div className="relative z-10 flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                  <ScanFace className="h-3.5 w-3.5" />
                  Turnstile Biometric Gate
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateGate}
                    className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition border border-emerald-500/40"
                  >
                    {gateStatus === "SCANNING" ? "Scanning..." : "Simulate Gate"}
                  </button>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    GATE HUD READY
                  </span>
                </div>
              </div>

              {/* Animated Face Reticle HUD */}
              <div className="relative z-10 my-2 rounded-2xl bg-slate-950/90 p-4 sm:p-5 border border-emerald-500/30 overflow-hidden shadow-inner backdrop-blur-md">
                {/* Scanline laser animation */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan shadow-[0_0_14px_#34d399]" />

                <div className="flex items-center gap-4">
                  {/* Target Box with Corner Brackets */}
                  <div className="relative h-20 w-20 shrink-0 rounded-xl bg-slate-900/90 border border-emerald-500/40 grid place-items-center">
                    {/* Glowing Reticle Corner Accents */}
                    <span className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-emerald-400" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-emerald-400" />
                    <span className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-emerald-400" />
                    <span className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-emerald-400" />
                    <ScanFace className={`h-10 w-10 text-emerald-400/80 ${gateStatus === "SCANNING" ? "animate-spin text-amber-400" : "animate-pulse"}`} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-2.5 py-0.5 font-mono text-[11px] font-bold ${gateStatus === "SCANNING" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                        {gateStatus === "SCANNING" ? "COMPUTING 512-D VECTOR..." : "MATCH: 99.82% CONFIDENCE"}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                        {speedCount.toFixed(2)}s
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${gateStatus === "SCANNING" ? "text-amber-400 animate-spin" : "text-emerald-400"}`} />
                      {gateStatus === "SCANNING" ? "Verifying face tensor against gate manifest..." : "Turnstile Barrier: OPEN"}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      Face Tensor: 512-d normalized InceptionResnet
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-2 flex items-center justify-between text-xs text-slate-400">
                <span>Contactless optical turnstile speed &lt; 0.4s</span>
                <span className="font-bold text-emerald-400 group-hover:underline flex items-center gap-1">
                  Test Pass Flow →
                </span>
              </div>
            </SpotlightGlassCard>

            {/* Bento Card 3: Official TC / Inspector Terminal (Gold Spotlight) */}
            <SpotlightGlassCard
              onClick={() => onNavigate("inspector")}
              spotlightColor="rgba(251, 191, 36, 0.28)"
              spotlightRadius={380}
              className="group cursor-pointer md:col-span-1 lg:col-span-4 rounded-[2rem] bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl p-6 sm:p-7 text-white shadow-2xl border border-amber-500/30 transition-all duration-300 hover:-translate-y-2 hover:border-amber-400/70 hover:shadow-amber-500/20 flex flex-col justify-between min-h-[300px]"
            >
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                    Official TTE Scanner
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Sec 138 Tariff
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  TC / Inspector Terminal
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  Scan passenger faces on train coaches or at station barriers, verify issued passes, and assess station-specific penalties.
                </p>
              </div>

              <div className="relative z-10 pt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
                  Open Inspector Scanner <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Role: Official
                </span>
              </div>
            </SpotlightGlassCard>

            {/* Bento Card 4: My Active Tickets (Frosted Glass & Warm Spotlight) */}
            <SpotlightGlassCard
              onClick={() => onNavigate("active")}
              spotlightColor="rgba(243, 112, 33, 0.22)"
              spotlightRadius={380}
              className="group cursor-pointer md:col-span-1 lg:col-span-4 rounded-[2rem] bg-white/80 backdrop-blur-2xl p-6 sm:p-7 shadow-2xl border border-white/90 transition-all duration-300 hover:-translate-y-2 hover:border-orange-400/60 hover:shadow-orange-500/15 flex flex-col justify-between min-h-[300px]"
            >
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-[#F37021] ring-1 ring-orange-200">
                    <TicketIcon className="h-3.5 w-3.5" />
                    My Active Tickets
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 text-xs">
                    {activeCount} Active
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Turnstile Boarding Passes
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {activeCount > 0
                    ? `You currently have ${activeCount} active digital biometric passes ready for contactless gate matching.`
                    : "Manage your registered rides, view biometric embedding status, and inspect ride history."}
                </p>
              </div>

              <div className="relative z-10 pt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F37021] group-hover:translate-x-1 transition-transform">
                  View Passes <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  Instant Gate Entry
                </span>
              </div>
            </SpotlightGlassCard>

            {/* Bento Card 5: Secondary Tools Grid (Glassmorphism & Blue/Cyan Spotlight) */}
            <SpotlightGlassCard
              spotlightColor="rgba(59, 130, 246, 0.18)"
              spotlightRadius={380}
              className="md:col-span-2 lg:col-span-4 rounded-[2rem] bg-white/80 backdrop-blur-2xl p-6 sm:p-7 shadow-2xl border border-white/90 flex flex-col justify-between min-h-[300px] transition-all duration-300 hover:-translate-y-2 hover:border-blue-300/70 hover:shadow-blue-500/10"
            >
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Metro Services
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold">
                    EW Corridor
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Transit Utilities
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Instant fare calculation, route planning, timetable &amp; station directory.
                </p>
              </div>

              {/* Pills Grid */}
              <div className="relative z-10 pt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate("fare")}
                  className="flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur-sm p-2.5 text-xs font-bold text-slate-800 transition hover:bg-[#F37021] hover:text-white group/pill text-left border border-orange-100 shadow-xs hover:scale-102"
                >
                  <IndianRupee className="h-4 w-4 text-[#F37021] group-hover/pill:text-white shrink-0" />
                  <span className="truncate">Fare Enquiry</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate("planner")}
                  className="flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur-sm p-2.5 text-xs font-bold text-slate-800 transition hover:bg-amber-500 hover:text-slate-900 group/pill text-left border border-amber-100 shadow-xs hover:scale-102"
                >
                  <Route className="h-4 w-4 text-amber-600 group-hover/pill:text-slate-900 shrink-0" />
                  <span className="truncate">Journey Planner</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate("stations")}
                  className="flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur-sm p-2.5 text-xs font-bold text-slate-800 transition hover:bg-[#1E56B3] hover:text-white group/pill text-left border border-blue-100 shadow-xs hover:scale-102"
                >
                  <Train className="h-4 w-4 text-[#1E56B3] group-hover/pill:text-white shrink-0" />
                  <span className="truncate">Station List</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModal("map")}
                  className="flex items-center gap-2 rounded-xl bg-white/80 backdrop-blur-sm p-2.5 text-xs font-bold text-slate-800 transition hover:bg-emerald-600 hover:text-white group/pill text-left border border-emerald-100 shadow-xs hover:scale-102"
                >
                  <Map className="h-4 w-4 text-emerald-600 group-hover/pill:text-white shrink-0" />
                  <span className="truncate">Metro Map</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModal("timetable")}
                  className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-slate-100/90 backdrop-blur-sm p-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-800 hover:text-white group/pill text-center border border-slate-200/80 shadow-xs hover:scale-101"
                >
                  <Clock3 className="h-4 w-4 text-slate-600 group-hover/pill:text-white shrink-0" />
                  <span>Timetable &amp; Train Frequency (6 AM - 10 PM)</span>
                </button>
              </div>
            </SpotlightGlassCard>
          </div>
        </section>

      </div>

      {/* ============================================================ */}
      {/* MODALS FOR METRO MAP & TIMETABLE */}
      {/* ============================================================ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-2xl p-6 sm:p-7 shadow-2xl border border-white/60 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                {modal === "map" ? (
                  <Map className="h-6 w-6 text-[#F37021]" />
                ) : (
                  <Clock3 className="h-6 w-6 text-[#F37021]" />
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {modal === "map"
                      ? "Ahmedabad Metro EW Corridor Map"
                      : "Metro Timetable & Frequency"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official Transit Operational Guide • આપણી મેટ્રો
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            {modal === "map" && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="rounded-2xl bg-orange-50/70 p-4 border border-orange-200/60">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#F37021] block">
                    East-West Line (Total Length: 21.16 km)
                  </span>
                  <p className="text-xs text-slate-600 mt-1">
                    Connects Vastral Gam in the East to Thaltej Gam in the West through 16 operational stations with central interchange at Old High Court.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Stations in Sequence:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {EW_STATIONS.map((st, i) => (
                      <div
                        key={st}
                        className={`p-2 rounded-xl border flex items-center gap-2 ${
                          st === "Old High Court"
                            ? "bg-amber-50 border-amber-300 font-bold text-amber-900"
                            : i === 0 || i === EW_STATIONS.length - 1
                            ? "bg-blue-50 border-blue-200 font-bold text-blue-900"
                            : "bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        <span className="text-[10px] text-slate-400 font-mono w-4">
                          {i + 1}.
                        </span>
                        <span className="truncate">{st}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModal(null);
                      onNavigate("stations");
                    }}
                    className="rounded-xl bg-[#F37021] px-4 py-2 text-xs font-bold text-white hover:bg-orange-700 transition"
                  >
                    Open Full Interactive Station Track →
                  </button>
                </div>
              </div>
            )}

            {modal === "timetable" && (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200 space-y-1">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                      First Train Departure
                    </span>
                    <span className="text-2xl font-extrabold text-blue-950">06:20 AM</span>
                    <p className="text-slate-600">Both from Vastral Gam and Thaltej Gam</p>
                  </div>

                  <div className="rounded-2xl bg-orange-50 p-4 border border-orange-200 space-y-1">
                    <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">
                      Last Train Departure
                    </span>
                    <span className="text-2xl font-extrabold text-orange-950">10:00 PM</span>
                    <p className="text-slate-600">Night service closure for track inspection</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">Train Frequency &amp; Headway</h4>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <span>Peak Hours (08:00 AM – 11:30 AM &amp; 05:00 PM – 08:30 PM):</span>
                      <strong className="text-emerald-700 font-bold">Every 8 to 10 Minutes</strong>
                    </li>
                    <li className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <span>Non-Peak Hours (11:30 AM – 05:00 PM &amp; 08:30 PM – 10:00 PM):</span>
                      <strong className="text-blue-700 font-bold">Every 12 to 15 Minutes</strong>
                    </li>
                    <li className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <span>Sundays &amp; Public Gazetted Holidays:</span>
                      <strong className="text-slate-800 font-bold">Every 12 Minutes uniform</strong>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
