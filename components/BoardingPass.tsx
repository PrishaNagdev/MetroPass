import { ArrowRight, CheckCircle2, ScanFace, ShieldCheck, Cpu, Sparkles, UserCheck } from "lucide-react";
import type { Ticket } from "@/lib/stations";

export const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export function TicketCard({
  t,
  children,
}: {
  t: Pick<Ticket, "source_station" | "dest_station" | "travel_date" | "passengers" | "fare" | "passenger_name">;
  children?: React.ReactNode;
}) {
  const d = new Date(t.travel_date + "T00:00:00");
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-lg border border-slate-100">
      <div className="bg-gradient-to-r from-brand to-brand-dark px-5 py-2.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ahmedabad Metro" className="h-6 w-auto object-contain bg-white rounded p-0.5 shadow-xs" />
          <span className="text-xs font-bold tracking-wider uppercase">Ahmedabad Metro • Single Pass</span>
        </div>
        <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded">
          Biometric Pass Enabled
        </span>
      </div>

      <div className="grid sm:grid-cols-[180px_1fr]">
        <div className="relative flex flex-col items-center justify-center bg-slate-900 py-6 text-white text-center sm:border-r border-slate-100">
          <p className="text-4xl font-extrabold tracking-tight text-white">
            {String(d.getDate()).padStart(2, "0")}
          </p>
          <p className="text-sm font-semibold tracking-wider text-brand uppercase mt-0.5">
            {d.toLocaleString("en-IN", { month: "short", year: "numeric" })}
          </p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">
            <ClockIcon /> Valid for 180 min
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Route</span>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-lg font-bold text-slate-900">
              <span className="text-slate-900">{t.source_station}</span>
              <ArrowRight className="h-4 w-4 text-brand shrink-0" />
              <span className="text-brand-dark">{t.dest_station}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Passenger</p>
              <p className="font-bold text-slate-800 truncate">{t.passenger_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Quantity</p>
              <p className="font-bold text-slate-800">{t.passengers} User</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Fare Paid</p>
              <p className="font-bold text-emerald-600">₹{t.fare.toFixed(2)}</p>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3 w-3 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function BoardingPass({
  t,
  compact = false,
  onToggleStatus,
}: {
  t: Ticket;
  compact?: boolean;
  onToggleStatus?: (ticketId: string) => void;
}) {
  const isActive = t.status.startsWith("ACTIVE");

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200/80">
        {/* Pass Top Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Ahmedabad Metro" className="h-7 w-auto object-contain bg-white rounded p-0.5 shadow-sm" />
            <span className="font-bold tracking-wide text-sm sm:text-base">METROPASS DIGITAL TICKET</span>
          </div>
          <span className="font-mono text-xs text-orange-200 font-semibold tracking-wider">AHMEDABAD METRO • આપણી મેટ્રો</span>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Ticket ID & Badges Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] uppercase font-semibold text-slate-400 block tracking-wider">Ticket ID</span>
              <span className="font-mono text-lg font-bold text-slate-900">{t.ticket_id}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Badge: ACTIVE (READY FOR TURNSTILE) or USED */}
              {isActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-300/80 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>STATUS: ACTIVE (READY FOR TURNSTILE)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-300">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>STATUS: USED</span>
                </span>
              )}

              {/* Biometric Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
                <Cpu className="h-3.5 w-3.5 text-violet-600" />
                Face Registered (Biometric Pass)
              </span>
            </div>
          </div>

          {/* Route Section */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>ORIGIN</span>
              <span>DESTINATION</span>
            </div>
            <div className="flex items-center justify-between text-base sm:text-lg font-bold text-slate-900">
              <span className="text-slate-800">{t.source_station}</span>
              <div className="flex items-center gap-2 px-3">
                <span className="h-0.5 w-6 sm:w-12 bg-brand" />
                <ArrowRight className="h-4 w-4 text-brand" />
              </div>
              <span className="text-brand-dark">{t.dest_station}</span>
            </div>
          </div>

          {/* Passenger & Journey Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Passenger</span>
              <span className="font-bold text-slate-800">{t.passenger_name}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Date</span>
              <span className="font-medium text-slate-800">
                {new Date(t.travel_date + "T00:00:00").toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Passengers</span>
              <span className="font-medium text-slate-800">1 (Single User)</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Fare Paid</span>
              <span className="font-bold text-emerald-600">₹{t.fare.toFixed(2)}</span>
            </div>
          </div>

          {/* Photo & Biometric Details (if face photo is available) */}
          {t.face_url && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.face_url}
                alt={t.passenger_name}
                className="h-12 w-12 rounded-lg object-cover ring-2 ring-brand/50 shadow-sm"
              />
              <div className="text-xs text-slate-600">
                <p className="font-semibold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Biometric Identity Verified
                </p>
                <p className="text-slate-500">128-dimensional Deep Learning face embedding saved for gate matching.</p>
              </div>
            </div>
          )}

          {/* Turnstile Instruction Text */}
          <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand-tint/60 p-4 text-sm text-slate-800">
            <ScanFace className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div>
              <p className="font-semibold text-slate-900">
                No QR code needed. Look directly into the gate camera at the turnstile to enter.
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                The AI camera at the turnstile will detect your face, compute the biometric face vector, match this ticket, and open the gate automatically.
              </p>
            </div>
          </div>

          {/* Simulated Gate Entry Toggle for testing */}
          {onToggleStatus && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="text-slate-500">Turnstile Demo Simulator:</span>
              <button
                type="button"
                onClick={() => onToggleStatus(t.ticket_id)}
                className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-dark transition underline underline-offset-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isActive ? "Simulate Gate Entry (Mark as USED)" : "Reset to ACTIVE"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
