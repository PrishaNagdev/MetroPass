"use client";
import { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  UserRound,
  Ticket as TicketIcon,
  Train,
  GitFork,
  ArrowLeftRight,
  Clock,
  ArrowRight,
  Sparkles,
  MapPin,
} from "lucide-react";
import { STATIONS, getJourneyDetails, JourneyDetails } from "@/lib/stations";

type Props = {
  onBack: () => void;
  onBookRoute?: (src: string, dst: string) => void;
};

export default function JourneyPlanner({ onBack, onBookRoute }: Props) {
  const [source, setSource] = useState<string>("Rabari Colony");
  const [dest, setDest] = useState<string>("Apparel Park");
  const [journeyResult, setJourneyResult] = useState<JourneyDetails | null>(() =>
    getJourneyDetails("Rabari Colony", "Apparel Park")
  );
  const [showStops, setShowStops] = useState(false);

  const handleShowRoute = () => {
    if (!source || !dest || source === dest) {
      setJourneyResult(null);
      return;
    }
    const details = getJourneyDetails(source, dest);
    setJourneyResult(details);
  };

  // Get intermediate stops list if route exists
  const stopsList = (() => {
    if (!journeyResult) return [];
    const srcIdx = STATIONS.indexOf(journeyResult.source);
    const dstIdx = STATIONS.indexOf(journeyResult.dest);
    if (srcIdx < 0 || dstIdx < 0) return [];
    if (srcIdx <= dstIdx) {
      return STATIONS.slice(srcIdx, dstIdx + 1);
    } else {
      return STATIONS.slice(dstIdx, srcIdx + 1).reverse();
    }
  })();

  return (
    <div className="min-h-[85vh] bg-slate-50/70 pb-16">
      {/* Official Top Orange Header Bar */}
      <div className="sticky top-0 z-20 bg-brand text-white shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Go Back to Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Journey Planner</h1>
          </div>
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 opacity-90" />
          </div>
        </div>
      </div>

      {/* Main Responsive Container */}
      <div className="mx-auto max-w-lg px-4 pt-6 sm:pt-8 space-y-6">
        {/* Form Card */}
        <div className="rounded-2xl bg-white p-6 sm:p-7 shadow-md border border-slate-200/80 space-y-5">
          {/* Station From */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[#800000]">From</label>
            <div className="relative">
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                }}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-10 text-base font-semibold text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 transition shadow-xs"
              >
                <option value="">Select From Station</option>
                {STATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
            </div>
          </div>

          {/* Station To */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[#800000]">To</label>
            <div className="relative">
              <select
                value={dest}
                onChange={(e) => {
                  setDest(e.target.value);
                }}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-10 text-base font-semibold text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 transition shadow-xs"
              >
                <option value="">Select To Station</option>
                {STATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
            </div>
          </div>

          {/* Validation Warning */}
          {source && dest && source === dest && (
            <p className="text-center text-xs font-semibold text-amber-600">
              Please select two different stations to plan your journey.
            </p>
          )}

          {/* Show Route & Fare Button (Bright Yellow/Gold as in Screenshot 1) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleShowRoute}
              disabled={!source || !dest || source === dest}
              className="w-full rounded-xl bg-[#F5B800] py-3.5 text-base font-bold text-slate-900 shadow-md transition hover:bg-[#E5AC00] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Show Route &amp; Fare
            </button>
          </div>
        </div>

        {/* Result Card (matching Screenshot 1) */}
        {journeyResult && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-md border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
            {/* Yellow Header Banner */}
            <div className="bg-[#F5B800] px-5 py-3.5 text-center">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {journeyResult.source} To {journeyResult.dest}
              </h2>
            </div>

            {/* Metrics List with Icons */}
            <div className="divide-y divide-slate-100 p-4 sm:p-5">
              {/* Row 1: Fare */}
              <div className="flex items-center gap-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-[#ED6B28] shrink-0 border border-amber-100">
                  <TicketIcon className="h-5 w-5" />
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-800">
                  Fare Rs. {journeyResult.fare}
                </div>
              </div>

              {/* Row 2: Stations count */}
              <div className="flex items-center gap-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#1E56B3] shrink-0 border border-blue-100">
                  <Train className="h-5 w-5" />
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-800">
                  Stations {journeyResult.stops}
                </div>
              </div>

              {/* Row 3: Interchange */}
              <div className="flex items-center gap-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-700 shrink-0 border border-purple-100">
                  <GitFork className="h-5 w-5" />
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-800">
                  Interchange - {journeyResult.interchange}
                </div>
              </div>

              {/* Row 4: Distance Km */}
              <div className="flex items-center gap-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 shrink-0 border border-emerald-100">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-800">
                  {journeyResult.distanceText}
                </div>
              </div>

              {/* Row 5: Time Min */}
              <div className="flex items-center gap-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-brand shrink-0 border border-orange-100">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-800">
                  {journeyResult.minutesText}
                </div>
              </div>
            </div>

            {/* Disclaimer Text */}
            <div className="px-5 pb-5 pt-1">
              <p className="text-center text-xs font-medium text-slate-500">
                Time shown is estimated travel time only (subject to train frequency)
              </p>
            </div>

            {/* Stops Expansion & Quick Booking actions */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowStops((s) => !s)}
                  className="font-semibold text-brand hover:underline flex items-center gap-1"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {showStops ? "Hide Station Stops" : `View all ${stopsList.length} stations on route`}
                </button>

                <span className="text-slate-400 font-mono text-[11px]">
                  EW Line (Direct)
                </span>
              </div>

              {showStops && (
                <div className="rounded-xl bg-white p-3 border border-slate-200 text-xs space-y-1.5 animate-in fade-in duration-150">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Route Sequence:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {stopsList.map((st, i) => (
                      <span key={st} className="inline-flex items-center gap-1">
                        <span
                          className={`rounded px-2 py-0.5 font-medium ${
                            i === 0 || i === stopsList.length - 1
                              ? "bg-brand text-white font-bold"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {st}
                        </span>
                        {i < stopsList.length - 1 && (
                          <span className="text-slate-300">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {onBookRoute && (
                <button
                  type="button"
                  onClick={() => onBookRoute(journeyResult.source, journeyResult.dest)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow hover:bg-brand-dark transition"
                >
                  <Sparkles className="h-4 w-4" /> Book Face Pass on this Route (₹{journeyResult.fare})
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
