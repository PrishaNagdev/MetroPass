"use client";
import { useState } from "react";
import { ArrowLeft, UserRound, Search, Train, ArrowRight, ShieldCheck } from "lucide-react";
import { EW_STATIONS, STATION_DISTANCES } from "@/lib/stations";

type Props = {
  onBack: () => void;
  onSelectStation?: (station: string) => void;
};

export default function StationList({ onBack, onSelectStation }: Props) {
  const [query, setQuery] = useState("");

  const filteredStations = EW_STATIONS.filter((st) =>
    st.toLowerCase().includes(query.toLowerCase())
  );

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
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Station List</h1>
          </div>
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 opacity-90" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6 sm:pt-8 space-y-6">
        {/* EW Line Header Badge (Strictly EW Line as requested) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#1E56B3] px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm flex items-center gap-2">
              <Train className="h-4 w-4" /> EW Line (East-West Corridor)
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline font-medium">
              16 Operational Stations
            </span>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            Vastral Gam ↔ Thaltej Gam
          </span>
        </div>

        {/* Quick Search for Desktop & Mobile */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search stations on EW Line..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 shadow-xs"
          />
        </div>

        {/* Vertical Metro Track Route Display (matching Screenshot 2) */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-md">
          <div className="relative">
            {/* The Vertical Blue Rail Track */}
            <div className="absolute right-4 sm:right-6 top-4 bottom-4 w-1.5 bg-[#1E56B3] rounded-full" />

            {/* Stations List */}
            <div className="space-y-6 sm:space-y-7 relative">
              {filteredStations.map((st, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === filteredStations.length - 1;
                const isInterchange = st === "Old High Court";
                const dist = STATION_DISTANCES[st] ?? 0;

                return (
                  <div
                    key={st}
                    className="flex items-center justify-between pr-2 group hover:bg-slate-50/80 -mx-3 px-3 py-1.5 rounded-xl transition cursor-pointer"
                    onClick={() => onSelectStation?.(st)}
                  >
                    {/* Left: Station Name & Meta */}
                    <div className="flex-1 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-brand transition">
                          {st}
                        </span>
                        {isInterchange && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-300">
                            Interchange (NS Line)
                          </span>
                        )}
                        {(isFirst || isLast) && (
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#1E56B3] ring-1 ring-blue-200">
                            Terminus
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {dist.toFixed(2)} km from Vastral Gam
                      </span>
                    </div>

                    {/* Right: Metro Track Node (matching Screenshot 2) */}
                    <div className="relative z-10 flex items-center justify-center w-7">
                      {isFirst || isLast ? (
                        // Terminal station node: thick blue ring with hollow center
                        <div className="h-5 w-5 rounded-full border-4 border-[#1E56B3] bg-white shadow-sm ring-2 ring-blue-100" />
                      ) : isInterchange ? (
                        // Interchange node: special double ring
                        <div className="h-4.5 w-4.5 rounded-full border-2 border-amber-500 bg-white shadow-xs ring-2 ring-amber-200" />
                      ) : (
                        // Intermediate station node: white circle on the blue line
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-[#1E56B3] bg-white shadow-xs group-hover:scale-125 transition-transform" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
