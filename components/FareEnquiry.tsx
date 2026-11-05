"use client";
import { useState } from "react";
import { ArrowLeft, ChevronDown, UserRound, ArrowRight } from "lucide-react";
import { STATIONS, getJourneyDetails } from "@/lib/stations";

type Props = {
  onBack: () => void;
  onBookRoute?: (src: string, dst: string) => void;
};

export default function FareEnquiry({ onBack, onBookRoute }: Props) {
  const [source, setSource] = useState<string>("Vastral Gam");
  const [dest, setDest] = useState<string>("Kankariya East");
  const [journeyType, setJourneyType] = useState<"single">("single");
  const [fareResult, setFareResult] = useState<number | null>(10);
  const [calculated, setCalculated] = useState(true);

  const calculateFare = () => {
    if (!source || !dest || source === dest) {
      setFareResult(null);
      setCalculated(false);
      return;
    }
    const details = getJourneyDetails(source, dest);
    if (details) {
      setFareResult(details.fare);
      setCalculated(true);
    } else {
      setFareResult(null);
      setCalculated(false);
    }
  };

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
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Fare Enquiry</h1>
          </div>
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 opacity-90" />
          </div>
        </div>
      </div>

      {/* Main Responsive Form Card */}
      <div className="mx-auto max-w-lg px-4 pt-6 sm:pt-10">
        <div className="overflow-hidden rounded-2xl bg-white p-6 sm:p-8 shadow-md border border-slate-200/80">
          <div className="space-y-5">
            {/* Station From */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">Station From</label>
              <div className="relative">
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setCalculated(false);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-10 text-base font-medium text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 transition shadow-xs"
                >
                  <option value="">Select Station From</option>
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
              <label className="block text-sm font-semibold text-slate-800">Station To</label>
              <div className="relative">
                <select
                  value={dest}
                  onChange={(e) => {
                    setDest(e.target.value);
                    setCalculated(false);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-10 text-base font-medium text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 transition shadow-xs"
                >
                  <option value="">Select Station To</option>
                  {STATIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600" />
              </div>
            </div>

            {/* Journey Type */}
            <div className="space-y-2 pt-1">
              <span className="block text-sm font-semibold text-slate-800">Journey Type</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setJourneyType("single")}
                  className={`rounded-xl px-6 py-2.5 text-sm font-bold transition shadow-xs ${
                    journeyType === "single"
                      ? "bg-brand text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Single
                </button>
              </div>
            </div>

            {/* Get Fare Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={calculateFare}
                disabled={!source || !dest || source === dest}
                className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white shadow-md transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Get Fare
              </button>
            </div>

            {/* Same Station Validation Warning */}
            {source && dest && source === dest && (
              <p className="text-center text-xs font-semibold text-amber-600">
                Please select two different stations for fare calculation.
              </p>
            )}

            {/* Result Box (matching Screenshot 3) */}
            {calculated && fareResult !== null && (
              <div className="mt-6 rounded-2xl bg-orange-50/70 border border-orange-200/70 p-6 text-center space-y-1 animate-in fade-in zoom-in-95 duration-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                  Total Fare
                </span>
                <div className="text-4xl font-extrabold text-brand tracking-tight">
                  ₹{fareResult.toFixed(2)}
                </div>
                <p className="text-xs font-semibold text-emerald-600">
                  0% discount applied
                </p>

                {onBookRoute && (
                  <div className="pt-4 border-t border-orange-200/50 mt-4">
                    <button
                      type="button"
                      onClick={() => onBookRoute(source, dest)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-dark transition underline underline-offset-4"
                    >
                      <span>Proceed to Book Ticket on this Route</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
