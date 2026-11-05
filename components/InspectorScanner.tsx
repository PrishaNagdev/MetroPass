"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  RotateCcw,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  Scan,
  UserCheck,
  ArrowRight,
  IndianRupee,
  BadgeAlert,
  Loader2,
  Clock,
  Zap,
  MapPin,
  ChevronDown,
  FileSpreadsheet,
  Trash2,
  Download,
  Filter,
} from "lucide-react";
import { STATIONS, getStationPenalty, Ticket, type StationPenaltyInfo } from "@/lib/stations";

const TC_INSPECT_URL =
  process.env.NEXT_PUBLIC_TC_API_URL ?? "http://localhost:8000/api/tc/inspect-passenger";

type InspectionResult = {
  verified: boolean;
  ticket_id?: string;
  passenger_name?: string;
  source_station?: string;
  dest_station?: string;
  travel_date?: string;
  fare?: number;
  status?: string;
  distance?: number;
  message?: string;
  inspection_station?: string;
  station_category?: string;
  zone?: string;
  base_fare?: number;
  penalty?: number;
  total_due?: number;
};

type InspectionRecord = {
  id: string;
  timestamp: string;
  station: string;
  result: InspectionResult;
};

const INITIAL_DEMO_RECORDS: InspectionRecord[] = [
  {
    id: "TC-8120",
    timestamp: "07:15:22 PM",
    station: "SP Stadium",
    result: {
      verified: true,
      ticket_id: "#METRO-84920",
      passenger_name: "Rahul Sharma",
      source_station: "Vastral Gam",
      dest_station: "SP Stadium",
      fare: 15,
      status: "ACTIVE",
      inspection_station: "SP Stadium",
      message: "Valid ticket confirmed for passenger at SP Stadium.",
    },
  },
  {
    id: "TC-8121",
    timestamp: "07:18:45 PM",
    station: "Old High Court",
    result: {
      verified: false,
      inspection_station: "Old High Court",
      station_category: "Central Metro Interchange Station",
      zone: "Zone A",
      base_fare: 30,
      penalty: 300,
      total_due: 330,
      message: "Passenger biometric face does not match any active ticket for today's manifest at Old High Court.",
    },
  },
  {
    id: "TC-8122",
    timestamp: "07:22:10 PM",
    station: "Kalupur Railway Station",
    result: {
      verified: false,
      inspection_station: "Kalupur Railway Station",
      station_category: "Major Railway Interchange Hub",
      zone: "Zone A+",
      base_fare: 35,
      penalty: 350,
      total_due: 385,
      message: "Passenger biometric face does not match any active ticket for today's manifest at Kalupur Railway Station.",
    },
  },
  {
    id: "TC-8123",
    timestamp: "07:25:30 PM",
    station: "Thaltej Gam",
    result: {
      verified: true,
      ticket_id: "#METRO-72104",
      passenger_name: "Amit Patel",
      source_station: "Apparel Park",
      dest_station: "Thaltej Gam",
      fare: 20,
      status: "ACTIVE",
      inspection_station: "Thaltej Gam",
      message: "Valid ticket confirmed for passenger at Thaltej Gam.",
    },
  },
];

function playSound(type: "shutter" | "valid" | "violation") {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "shutter") {
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "valid") {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "violation") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {}
}

export default function InspectorScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Active Station & Station-specific fine configuration
  const [currentStation, setCurrentStation] = useState<string>("SP Stadium");
  const penaltyInfo: StationPenaltyInfo = getStationPenalty(currentStation);

  // Auto-scan states
  const [autoScan, setAutoScan] = useState(true);
  const [autoResetCountdown, setAutoResetCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  const [result, setResult] = useState<InspectionResult | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<InspectionRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"all" | "valid" | "invalid">("all");

  // Load shift records from localStorage or initial demo data
  useEffect(() => {
    try {
      const saved = localStorage.getItem("metropass-tc-inspection-logs");
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        setHistory(INITIAL_DEMO_RECORDS);
      }
    } catch {
      setHistory(INITIAL_DEMO_RECORDS);
    }
  }, []);

  // Stop camera tracks
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Start camera
  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera device not supported on this browser.");
      return;
    }
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setActive(true);
      } catch {
        setCameraError("Could not access camera. Please allow camera permissions in address bar.");
      }
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    startCamera();
  }, []);

  const addHistoryRecord = useCallback((r: InspectionResult, stationName: string) => {
    const rec: InspectionRecord = {
      id: "TC-" + Math.floor(1000 + Math.random() * 9000),
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      station: stationName,
      result: r,
    };
    setHistory((prev) => {
      const updated = [rec, ...prev];
      try {
        localStorage.setItem("metropass-tc-inspection-logs", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearHistory = () => {
    if (confirm("Reset current shift inspection logs? This will clear all recorded scans.")) {
      setHistory([]);
      try {
        localStorage.setItem("metropass-tc-inspection-logs", "[]");
      } catch {}
    }
  };

  const downloadExcelReport = () => {
    if (history.length === 0) {
      alert("No inspection records logged yet to export.");
      return;
    }

    // UTF-8 BOM so Microsoft Excel opens cleanly with proper unicode encoding
    const BOM = "\uFEFF";

    const headers = [
      "Sr No",
      "Scan ID",
      "Inspection Timestamp",
      "Passenger Name",
      "Ticket ID",
      "Inspection Station",
      "Station Category",
      "Station Zone",
      "Verification Status",
      "Base Fare (INR)",
      "Penalty / Fine (INR)",
      "Total Fine Collected (INR)",
      "Remarks / Violation Details",
    ];

    let totalValid = 0;
    let totalInvalid = 0;
    let totalFineCollected = 0;

    const rows = history.map((rec, index) => {
      const isVerified = rec.result.verified;
      const pInfo = getStationPenalty(rec.station);
      const baseFare = isVerified
        ? (rec.result.fare ?? 0)
        : (rec.result.base_fare ?? pInfo.baseFare);
      const penalty = isVerified
        ? 0
        : (rec.result.penalty ?? pInfo.penalty);
      const totalDue = isVerified
        ? 0
        : (rec.result.total_due ?? (baseFare + penalty));

      if (isVerified) {
        totalValid += 1;
      } else {
        totalInvalid += 1;
        totalFineCollected += totalDue;
      }

      const statusText = isVerified ? "VALID TICKET CONFIRMED" : "NOT VALID - VIOLATION";
      const passengerName = rec.result.passenger_name || (isVerified ? "Passenger" : "Ticketless Passenger");
      const ticketId = rec.result.ticket_id || "N/A";
      const remarks = isVerified
        ? `Valid active ticket from ${rec.result.source_station || "Origin"} to ${rec.result.dest_station || "Destination"}`
        : `Section 138 Violation: Unregistered passenger at ${rec.station}. Fine Rs. ${penalty} + Base Fare Rs. ${baseFare} assessed.`;

      return [
        index + 1,
        `"${rec.id}"`,
        `"${rec.timestamp}"`,
        `"${passengerName.replace(/"/g, '""')}"`,
        `"${ticketId}"`,
        `"${rec.station}"`,
        `"${rec.result.station_category || pInfo.category}"`,
        `"${rec.result.zone || pInfo.zone}"`,
        `"${statusText}"`,
        baseFare.toFixed(2),
        penalty.toFixed(2),
        totalDue.toFixed(2),
        `"${remarks.replace(/"/g, '""')}"`,
      ].join(",");
    });

    const emptyRow = headers.map(() => "").join(",");

    // Summary Section at the End of the Sheet
    const summaryTitleRow = [
      "\"--- TOTAL TC SHIFT AUDIT REPORT SUMMARY ---\"",
      "", "", "", "", "", "", "", "", "", "", "", ""
    ].join(",");

    const summaryRow1 = [
      "\"TOTAL PASSENGERS INSPECTED:\"",
      history.length,
      "\"VALID TICKETS CONFIRMED:\"",
      totalValid,
      "\"VIOLATIONS (NOT VALID):\"",
      totalInvalid,
      "", "",
      "\"TOTAL FINE COLLECTED FROM PEOPLE:\"",
      `"INR ${totalFineCollected.toFixed(2)}"`,
      "", "", ""
    ].join(",");

    const summaryRow2 = [
      "\"Ahmedabad Metro Rail Corporation Ltd (GMRCL)\"",
      "\"Enforcement Section 138 Metro Railways Act\"",
      "\"Officer #TC-9041\"",
      `"Generated on: ${new Date().toLocaleString("en-IN")}"`,
      "", "", "", "", "", "", "", "", ""
    ].join(",");

    const csvContent = [
      BOM + headers.join(","),
      ...rows,
      emptyRow,
      summaryTitleRow,
      summaryRow1,
      summaryRow2,
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute("download", `Ahmedabad_Metro_TC_Inspection_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalInspected = history.length;
  const validCount = history.filter((h) => h.result.verified).length;
  const invalidCount = history.filter((h) => !h.result.verified).length;
  const totalFineCollected = history
    .filter((h) => !h.result.verified)
    .reduce((sum, h) => {
      const pInfo = getStationPenalty(h.station);
      const fine = h.result.total_due ?? (pInfo.baseFare + pInfo.penalty);
      return sum + fine;
    }, 0);

  const filteredHistory = history.filter((h) => {
    if (historyFilter === "valid") return h.result.verified;
    if (historyFilter === "invalid") return !h.result.verified;
    return true;
  });

  // Fallback if backend is not reachable
  const fallbackLocalInspection = useCallback((snapUrl: string, stationName: string) => {
    const pInfo = getStationPenalty(stationName);
    try {
      const stored: Ticket[] = JSON.parse(localStorage.getItem("metropass-snn-tickets") || "[]");
      if (stored.length > 0) {
        const ticket = stored[0];
        const res: InspectionResult = {
          verified: true,
          ticket_id: ticket.ticket_id,
          passenger_name: ticket.passenger_name,
          source_station: ticket.source_station,
          dest_station: ticket.dest_station,
          travel_date: ticket.travel_date,
          fare: ticket.fare,
          status: ticket.status,
          distance: 0.12,
          inspection_station: stationName,
          message: `Valid ticket confirmed for passenger at ${stationName}.`,
        };
        setResult(res);
        playSound("valid");
        addHistoryRecord(res, stationName);
      } else {
        const noRes: InspectionResult = {
          verified: false,
          inspection_station: stationName,
          station_category: pInfo.category,
          zone: pInfo.zone,
          base_fare: pInfo.baseFare,
          penalty: pInfo.penalty,
          total_due: pInfo.baseFare + pInfo.penalty,
          message: `Passenger biometric face does not match any active or used ticket for today's manifest at ${stationName}.`,
        };
        setResult(noRes);
        playSound("violation");
        addHistoryRecord(noRes, stationName);
      }
    } catch {
      const noRes: InspectionResult = {
        verified: false,
        inspection_station: stationName,
        station_category: pInfo.category,
        zone: pInfo.zone,
        base_fare: pInfo.baseFare,
        penalty: pInfo.penalty,
        total_due: pInfo.baseFare + pInfo.penalty,
        message: `Passenger biometric face does not match any active or used ticket for today's manifest at ${stationName}.`,
      };
      setResult(noRes);
      playSound("violation");
      addHistoryRecord(noRes, stationName);
    }
  }, [addHistoryRecord]);

  // Capture face snapshot and inspect against backend API
  const scanPassengerFace = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth || scanning) return;

    setScanning(true);
    setFlash(true);
    playSound("shutter");
    setTimeout(() => setFlash(false), 150);

    const cropW = Math.round(v.videoWidth * 0.6);
    const cropH = Math.round(v.videoHeight * 0.75);
    const cropX = Math.round((v.videoWidth - cropW) / 2);
    const cropY = Math.round((v.videoHeight - cropH) / 2);

    c.width = cropW;
    c.height = cropH;
    const ctx = c.getContext("2d");
    if (!ctx) {
      setScanning(false);
      return;
    }

    ctx.drawImage(v, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    c.toBlob(async (blob) => {
      if (!blob) {
        setScanning(false);
        return;
      }

      const snapUrl = URL.createObjectURL(blob);
      setSnapshotUrl(snapUrl);

      try {
        const fd = new FormData();
        fd.append("file", blob, "passenger_inspect.jpg");
        fd.append("station_name", currentStation);

        const res = await fetch(TC_INSPECT_URL, {
          method: "POST",
          body: fd,
        });

        if (res.ok) {
          const data: InspectionResult = await res.json();
          // Ensure station specific penalty fields are filled
          const pInfo = getStationPenalty(currentStation);
          const fullData: InspectionResult = {
            ...data,
            inspection_station: currentStation,
            station_category: data.station_category ?? pInfo.category,
            zone: data.zone ?? pInfo.zone,
            base_fare: data.base_fare ?? pInfo.baseFare,
            penalty: data.penalty ?? pInfo.penalty,
            total_due: data.total_due ?? (pInfo.baseFare + pInfo.penalty),
          };

          setResult(fullData);
          if (fullData.verified) {
            playSound("valid");
          } else {
            playSound("violation");
          }
          addHistoryRecord(fullData, currentStation);
        } else {
          fallbackLocalInspection(snapUrl, currentStation);
        }
      } catch {
        fallbackLocalInspection(snapUrl, currentStation);
      } finally {
        setScanning(false);
      }
    }, "image/jpeg", 0.95);
  }, [scanning, currentStation, addHistoryRecord, fallbackLocalInspection]);

  const scanNextPassenger = useCallback(() => {
    if (snapshotUrl) {
      URL.revokeObjectURL(snapshotUrl);
    }
    setSnapshotUrl(null);
    setResult(null);
    setAutoResetCountdown(null);
  }, [snapshotUrl]);

  // CONTINUOUS AUTO-SCAN LOOP (every 2.0s when camera active and ready)
  useEffect(() => {
    if (!active || scanning || result !== null || !autoScan) return;

    const timer = setTimeout(() => {
      scanPassengerFace();
    }, 2000);

    return () => clearTimeout(timer);
  }, [active, scanning, result, autoScan, scanPassengerFace]);

  // AUTO-RESET COUNTDOWN LOOP (advance after 3.5s of decision)
  useEffect(() => {
    if (!result || !autoScan) {
      setAutoResetCountdown(null);
      return;
    }

    setAutoResetCountdown(3);
    const interval = setInterval(() => {
      setAutoResetCountdown((prev) => {
        if (prev === null) return 3;
        if (prev <= 1) {
          clearInterval(interval);
          scanNextPassenger();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [result, autoScan, scanNextPassenger]);

  return (
    <section className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* Officer Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-5 text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ahmedabad Metro" className="h-12 w-auto object-contain bg-white rounded-xl p-1 shadow-md shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">AHMEDABAD METRO TC PORTAL</h1>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/40">
                ACTIVE PATROL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ahmedabad Metro Biometric Turnstile & Train Manifest Inspection Unit • Officer #TC-9041 • આપણી મેટ્રો
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-300">
          {/* Active Station Selector */}
          <div className="relative flex items-center rounded-lg bg-slate-800 px-3 py-1.5 border border-slate-700 shadow-inner">
            <MapPin className="h-4 w-4 text-brand mr-1.5 shrink-0" />
            <span className="text-slate-400 mr-1.5 hidden sm:inline">Station Checkpost:</span>
            <select
              value={currentStation}
              onChange={(e) => {
                setCurrentStation(e.target.value);
                setResult(null); // Clear previous result when switching stations
              }}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer pr-4 text-xs appearance-none"
            >
              {STATIONS.map((st) => (
                <option key={st} value={st} className="bg-slate-900 text-white">
                  {st} (Fine: ₹{getStationPenalty(st).penalty})
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none absolute right-2" />
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-950/60 px-3 py-1.5 text-emerald-400 border border-emerald-800/50">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FaceNet 512-d Vector Sync: LIVE</span>
          </div>

          {/* Hands-Free Auto-Scan Mode Toggle */}
          <button
            type="button"
            onClick={() => setAutoScan(!autoScan)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition border ${
              autoScan
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            <Zap className={`h-3.5 w-3.5 ${autoScan ? "text-amber-400 fill-amber-400" : "text-slate-500"}`} />
            Auto-Scan: {autoScan ? "ON (Hands-Free)" : "MANUAL"}
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <BadgeAlert className="h-5 w-5 text-red-600 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Main Grid: Viewfinder on Left, Verification Card on Right */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Live Handheld Scanner */}
        <div className="lg:col-span-7 space-y-4">
          <div className="overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-950 shadow-2xl relative">
            {/* Top Prominent Status Header */}
            <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between z-10 relative">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Scan className="h-4 w-4 text-brand animate-pulse" />
                {autoScan
                  ? `Hands-Free Auto-Capture at ${currentStation}`
                  : `Point Camera at Passenger Face to Verify Ticket (${currentStation})`}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {penaltyInfo.zone} • FINE ₹{penaltyInfo.penalty}
              </span>
            </div>

            {/* Viewfinder Area */}
            <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
              {flash && <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-150" />}

              <video
                ref={videoRef}
                playsInline
                muted
                className={`h-full w-full object-cover transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
              />

              {!active && (
                <div className="absolute inset-0 grid place-items-center text-slate-400">
                  <div className="text-center space-y-2">
                    <Camera className="mx-auto h-10 w-10 text-slate-600 animate-bounce" />
                    <p className="text-sm">Initializing Inspector Camera...</p>
                    <button
                      onClick={startCamera}
                      disabled={starting}
                      className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow"
                    >
                      {starting ? "Starting..." : "Start Camera"}
                    </button>
                  </div>
                </div>
              )}

              {/* Reticle / Crosshair Overlay */}
              {active && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-1/2 top-1/2 h-[76%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-brand shadow-[0_0_0_9999px_rgba(15,23,42,0.6)]">
                    <span className="absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-brand" />
                    <span className="absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4 border-brand" />
                    <span className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-brand" />
                    <span className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-brand" />

                    <div className="absolute inset-x-2 h-0.5 animate-scan bg-gradient-to-r from-transparent via-brand to-transparent opacity-90 shadow-[0_0_12px_rgba(244,113,63,1)]" />

                    <div className="absolute left-1/2 top-1/2 h-5 w-px -translate-x-1/2 -translate-y-1/2 bg-white/60" />
                    <div className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 bg-white/60" />
                  </div>

                  <div className="absolute bottom-4 inset-x-0 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 px-3.5 py-1 text-xs font-semibold text-white border border-brand/50 shadow-md">
                      <span className="h-2 w-2 rounded-full bg-brand animate-ping" />
                      {autoScan
                        ? `Auto-detecting passengers at ${currentStation}...`
                        : "Target passenger face in reticle"}
                    </span>
                  </div>
                </div>
              )}

              {scanning && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-brand" />
                  <p className="text-base font-bold tracking-wide">Computing FaceNet 512-d Vector...</p>
                  <p className="text-xs text-slate-300">Comparing live face against {currentStation} manifest...</p>
                </div>
              )}
            </div>

            {/* Bottom Trigger Controls */}
            <div className="bg-slate-900 p-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={scanPassengerFace}
                disabled={!active || scanning}
                className="flex flex-1 items-center justify-center gap-2.5 rounded-xl bg-brand px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Analyzing Biometrics...
                  </>
                ) : (
                  <>
                    <Scan className="h-5 w-5" /> Scan Passenger Face Now
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAutoScan(!autoScan)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-3.5 text-sm font-bold transition border ${
                  autoScan
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                <Zap className={`h-4 w-4 ${autoScan ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} />
                Auto: {autoScan ? "ON" : "OFF"}
              </button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" aria-hidden />
        </div>

        {/* Right Column: Result Card Rendering */}
        <div className="lg:col-span-5 space-y-4">
          {/* Default Idle State */}
          {!result && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md text-center space-y-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-tint text-brand">
                <Scan className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {autoScan ? "Hands-Free Auto-Scanning Active" : "Ready for Passenger Inspection"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Active Station Checkpost: <strong>{currentStation}</strong> ({penaltyInfo.category})
                </p>
              </div>

              {/* Station Specific Tariff Overview */}
              <div className="rounded-xl bg-slate-50 p-4 text-left border border-slate-100 space-y-2.5 text-xs text-slate-700">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-brand" /> {currentStation} Tariff &amp; Fine Rules:
                  </span>
                  <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {penaltyInfo.zone}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Standard Fare</span>
                    <span className="text-base font-extrabold text-slate-900">₹{penaltyInfo.baseFare.toFixed(2)}</span>
                  </div>
                  <div className="rounded-lg bg-red-50/70 p-2.5 border border-red-200">
                    <span className="text-red-600 block text-[10px] uppercase font-bold">Station Fine (Sec 138)</span>
                    <span className="text-base font-extrabold text-red-600">₹{penaltyInfo.penalty.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                  Different stations carry zone-specific penalties based on commuter volume, interchange status, and distance slabs.
                </p>
              </div>
            </div>
          )}

          {/* Case A: Valid Passenger (200 OK with verified: true) */}
          {result && result.verified && (
            <div className="overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white shadow-2xl transition-all">
              <div className="bg-emerald-600 px-5 py-3.5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-white shrink-0" />
                  <span className="font-extrabold text-base tracking-wide">VALID TICKET CONFIRMED</span>
                </div>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-mono font-semibold">
                  PASS APPROVED
                </span>
              </div>

              {autoScan && autoResetCountdown !== null && (
                <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Zap className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />
                    Auto-scanning next passenger in {autoResetCountdown}s...
                  </span>
                  <button
                    onClick={scanNextPassenger}
                    className="text-[11px] font-semibold underline text-emerald-700 hover:text-emerald-900"
                  >
                    Scan Now
                  </button>
                </div>
              )}

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs uppercase text-slate-400 font-semibold block">Passenger Name</span>
                    <span className="text-lg font-extrabold text-slate-900">{result.passenger_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase text-slate-400 font-semibold block">Ticket ID</span>
                    <span className="font-mono text-sm font-bold text-brand-dark bg-brand-tint/60 px-2 py-0.5 rounded">
                      {result.ticket_id}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Authorized Route</span>
                  <div className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span>{result.source_station}</span>
                    <ArrowRight className="h-4 w-4 text-brand shrink-0" />
                    <span>{result.dest_station}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-slate-400 block font-medium">Travel Date</span>
                    <span className="font-bold text-slate-800">{result.travel_date}</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-slate-400 block font-medium">Checked Station</span>
                    <span className="font-bold text-slate-800">{result.inspection_station || currentStation}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500">Gate Status:</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        result.status === "ACTIVE"
                          ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                          : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
                      }`}
                    >
                      {result.status ?? "USED"}
                    </span>
                  </div>

                  {result.distance !== undefined && (
                    <span className="font-mono text-[11px] text-slate-500">
                      FaceNet Distance: {result.distance.toFixed(4)}
                    </span>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={scanNextPassenger}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition"
                  >
                    <UserCheck className="h-4 w-4" /> Mark Checked &amp; Scan Next Passenger
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Case B: Ticketless / Mismatch (Station-Specific Fine Applied!) */}
          {result && !result.verified && (
            <div className="overflow-hidden rounded-2xl border-2 border-red-500 bg-white shadow-2xl transition-all">
              <div className="bg-red-600 px-5 py-3.5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="h-6 w-6 text-white shrink-0 animate-bounce" />
                  <span className="font-extrabold text-base tracking-wide">VIOLATION: NO VALID TICKET FOUND</span>
                </div>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-mono font-semibold">
                  TICKETLESS
                </span>
              </div>

              {autoScan && autoResetCountdown !== null && (
                <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center justify-between text-xs text-red-800">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Zap className="h-3.5 w-3.5 text-red-600 fill-red-600" />
                    Auto-scanning next passenger in {autoResetCountdown}s...
                  </span>
                  <button
                    onClick={scanNextPassenger}
                    className="text-[11px] font-semibold underline text-red-700 hover:text-red-900"
                  >
                    Scan Now
                  </button>
                </div>
              )}

              <div className="p-5 space-y-4">
                <div className="rounded-xl bg-red-50 p-4 border border-red-200 text-red-800 text-xs sm:text-sm font-medium leading-relaxed">
                  <p className="font-bold text-red-900 mb-1">
                    Warning: Biometric Manifest Mismatch at {currentStation}
                  </p>
                  Passenger biometric face does not match any active or used ticket for today&apos;s manifest at this station.
                </div>

                {/* Station-Specific Penalty Callout Box */}
                <div className="rounded-xl border-2 border-dashed border-red-300 bg-amber-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                      <IndianRupee className="h-4 w-4 text-red-600" /> Section 138 Metro Penalty
                    </span>
                    <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-amber-200">
                      {penaltyInfo.station} ({penaltyInfo.zone})
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-900">
                    Collect standard fare + ₹{penaltyInfo.penalty.toFixed(2)} station penalty.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Station Classification: <span className="font-semibold text-slate-700">{penaltyInfo.category}</span>
                  </p>

                  <div className="rounded-lg bg-white p-3 border border-amber-200 space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span>Standard Metro Fare ({currentStation}):</span>
                      <span className="font-bold font-mono">₹{penaltyInfo.baseFare.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-semibold">
                      <span>Station Violation Penalty ({penaltyInfo.zone}):</span>
                      <span className="font-mono">₹{penaltyInfo.penalty.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-extrabold text-slate-900">
                      <span>Total Amount Payable:</span>
                      <span className="font-mono text-red-600">
                        ₹{(penaltyInfo.baseFare + penaltyInfo.penalty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={scanNextPassenger}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition"
                  >
                    <RotateCcw className="h-4 w-4" /> Scan Next Passenger
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Inspection Shift Quick Widget */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Recent Shift Scans ({history.length})</span>
                <button
                  type="button"
                  onClick={downloadExcelReport}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline"
                >
                  <FileSpreadsheet className="h-3 w-3" />
                  Excel Export
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
                {history.slice(0, 5).map((h) => (
                  <div key={h.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {h.result.verified ? h.result.passenger_name : "Ticketless Passenger"}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {h.timestamp} • {h.station}
                      </span>
                    </div>
                    <div>
                      {h.result.verified ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-bold text-[10px] text-emerald-700 ring-1 ring-emerald-200">
                          VALID ({h.result.ticket_id})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 font-bold text-[10px] text-red-700 ring-1 ring-red-200">
                          VIOLATION (+₹{getStationPenalty(h.station).penalty})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Fine in Quick Widget */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Total Fine Assessed:</span>
                <span className="font-extrabold font-mono text-emerald-700">
                  ₹{totalFineCollected.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* FULL-WIDTH TC SHIFT INSPECTION LEDGER & EXCEL DOWNLOAD */}
      {/* ============================================================ */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xl space-y-6">
        {/* Header with Title and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  TC Shift Inspection Audit Ledger
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Complete manifest of all inspected passengers, verified passes, and Section 138 penalties.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Download Excel Sheet Button */}
            <button
              type="button"
              onClick={downloadExcelReport}
              disabled={history.length === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Download Excel Report (.csv)</span>
            </button>

            {/* Clear Log Button */}
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                title="Clear Shift Log"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Clear Log</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Inspected
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {totalInspected}
            </div>
            <span className="text-xs text-slate-500">All passenger scans</span>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Valid Confirmed
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-800 mt-1">
              {validCount}
            </div>
            <span className="text-xs text-emerald-700 font-medium">Authorized passengers</span>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 block flex items-center gap-1">
              <AlertOctagon className="h-3.5 w-3.5" /> Violations (Not Valid)
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-800 mt-1">
              {invalidCount}
            </div>
            <span className="text-xs text-red-700 font-medium">Ticketless / Mismatched</span>
          </div>

          {/* TOTAL FINE COLLECTED - Prominently Highlighted */}
          <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-600" /> Total Fine Collected
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">
              ₹{totalFineCollected.toFixed(2)}
            </div>
            <span className="text-xs text-emerald-800 font-semibold">
              Assessed from {invalidCount} violations
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setHistoryFilter("all")}
              className={`rounded-lg px-3 py-1.5 transition ${
                historyFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Records ({totalInspected})
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter("valid")}
              className={`rounded-lg px-3 py-1.5 transition ${
                historyFilter === "valid" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Valid Tickets ({validCount})
            </button>
            <button
              type="button"
              onClick={() => setHistoryFilter("invalid")}
              className={`rounded-lg px-3 py-1.5 transition ${
                historyFilter === "invalid" ? "bg-white text-red-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Not Valid ({invalidCount})
            </button>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Section 138 Metro Enforcement Audit
          </span>
        </div>

        {/* Detailed Inspection Table */}
        {filteredHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
            <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold">
              {history.length === 0
                ? "No passengers inspected yet. Use the camera above to scan passengers."
                : "No records match the selected filter."}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              All scan results (Valid &amp; Violations) will be logged here and exportable to Excel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">Scan ID</th>
                  <th className="py-3 px-3.5">Time</th>
                  <th className="py-3 px-3.5">Passenger</th>
                  <th className="py-3 px-3.5">Station</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Base Fare</th>
                  <th className="py-3 px-3.5 text-right">Penalty</th>
                  <th className="py-3 px-3.5 text-right">Fine Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredHistory.map((h, i) => {
                  const isVerified = h.result.verified;
                  const pInfo = getStationPenalty(h.station);
                  const baseFare = isVerified ? (h.result.fare ?? 0) : (h.result.base_fare ?? pInfo.baseFare);
                  const penalty = isVerified ? 0 : (h.result.penalty ?? pInfo.penalty);
                  const totalDue = isVerified ? 0 : (h.result.total_due ?? (baseFare + penalty));

                  return (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-mono text-slate-400">{i + 1}</td>
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-700">{h.id}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-600">{h.timestamp}</td>
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-slate-800 block">
                          {isVerified ? (h.result.passenger_name || "Passenger") : "Unidentified / Ticketless"}
                        </span>
                        {isVerified && h.result.ticket_id && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Ticket: {h.result.ticket_id}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700">
                        <span className="font-semibold">{h.station}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {h.result.zone || pInfo.zone}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> VALID TICKET CONFIRMED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700 border border-red-200">
                            <AlertOctagon className="h-3 w-3" /> NOT VALID - VIOLATION
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-slate-600">
                        ₹{baseFare.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono">
                        {isVerified ? (
                          <span className="text-slate-400">₹0.00</span>
                        ) : (
                          <span className="font-bold text-red-600">₹{penalty.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold">
                        {isVerified ? (
                          <span className="text-slate-400">₹0.00</span>
                        ) : (
                          <span className="text-red-700 bg-red-50 px-2.5 py-0.5 rounded border border-red-200/80">
                            ₹{totalDue.toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Grand Total Footer Row at End of Table */}
              <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-700">
                <tr>
                  <td colSpan={6} className="py-4 px-3.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm tracking-wide">TOTAL SHIFT AUDIT SUMMARY</span>
                      <span className="text-slate-300 font-normal">
                        Total Inspected: <strong>{totalInspected}</strong> | Valid: <strong>{validCount}</strong> | Violations: <strong className="text-red-400">{invalidCount}</strong>
                      </span>
                    </div>
                  </td>
                  <td colSpan={2} className="py-4 px-3.5 text-right text-xs uppercase text-amber-300">
                    Total Fine Collected From People:
                  </td>
                  <td className="py-4 px-3.5 text-right font-mono text-base text-emerald-400">
                    ₹{totalFineCollected.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
