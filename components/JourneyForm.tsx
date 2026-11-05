import { ChevronDown, Clock, ShieldCheck, UserCheck } from "lucide-react";
import { STATIONS, estimateJourney } from "@/lib/stations";

export type Journey = { name: string; source: string; dest: string; date: string; passengers: number; group: boolean };

const field = "w-full appearance-none rounded-md border border-slate-300 bg-white px-4 py-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const label = "mb-2 block text-base font-medium text-slate-800";

export default function JourneyForm({ value: v, onChange, today }: { value: Journey; onChange: (j: Journey) => void; today: string }) {
  const set = (k: keyof Journey) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...v, [k]: e.target.value });
  const est = estimateJourney(v.source, v.dest, 1);
  const same = v.source && v.source === v.dest;

  return (
    <div>
      {/* Locked to Single Passenger Banner */}
      <div className="mb-5 flex items-center justify-between rounded-lg border border-brand/20 bg-brand-tint/40 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ahmedabad Metro" className="h-9 w-auto object-contain bg-white rounded p-0.5 shadow-xs shrink-0" />
          <div>
            <span className="text-sm font-bold text-slate-900">Ahmedabad Metro • Single Passenger</span>
            <p className="text-xs text-slate-600">Locked to 1 user per ticket for biometric matching (આપણી મેટ્રો)</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" /> 1:1 Biometric Match
        </span>
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className={label}>Passenger full name</span>
          <input
            className={`${field} ${v.name.trim().length > 0 && v.name.trim().length < 3 ? "border-amber-400 focus:border-amber-500 focus:ring-amber-200" : ""}`}
            placeholder="As on your ID (minimum 3 characters)"
            value={v.name}
            onChange={set("name")}
            autoComplete="name"
            minLength={3}
          />
          {v.name.trim().length > 0 && v.name.trim().length < 3 && (
            <p className="mt-1.5 text-xs font-medium text-amber-600">
              Please enter at least 3 characters for the passenger name (currently {v.name.trim().length} character{v.name.trim().length === 1 ? "" : "s"}).
            </p>
          )}
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          {(["source", "dest"] as const).map((k) => (
            <label key={k} className="relative block">
              <span className={label}>{k === "source" ? "Station From" : "Station To"}</span>
              <select className={field} value={v[k]} onChange={set(k)}>
                <option value="">{k === "source" ? "please select station from" : "please select station to"}</option>
                {STATIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute bottom-4 right-4 h-5 w-5 text-slate-700" />
            </label>
          ))}
        </div>
        {same && <p role="alert" className="text-sm text-red-600">Choose two different stations.</p>}

        <div className="grid items-end gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Date of travel</span>
            <input type="date" min={today} className={field} value={v.date} onChange={set("date")} />
          </label>

          {/* Passenger count locked strictly to 1 */}
          <div>
            <span className={label}>No. of Passengers</span>
            <div className="flex items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-slate-900">1 Passenger</span>
                <span className="text-xs text-slate-500">(Single User)</span>
              </div>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">Locked</span>
            </div>
          </div>
        </div>
        <p className="-mt-3 text-xs text-slate-500">
          Turnstile biometric gate requires strictly 1 face registration per ticket. Group bookings are disabled.
        </p>

        <div className="flex items-center justify-between rounded-xl bg-brand-tint p-4">
          <div>
            <p className="text-sm text-slate-600">Fare preview</p>
            <p className="text-3xl font-medium tabular-nums">{est ? `₹${est.fare.toFixed(2)}` : <span className="text-slate-400">₹—</span>}</p>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-slate-700">
            <Clock className="h-4 w-4 text-brand" />
            {est ? `~${est.minutes} min · ${est.stops} stops` : "Pick two stations"}
          </p>
        </div>

        <ul className="list-disc space-y-2 pl-5 text-sm text-red-600 marker:text-red-500">
          <li>Mobile tickets are non-refundable and non-transferable.</li>
          <li>Before booking your ticket, kindly refer to the timetable.</li>
          <li>Tickets are valid for entry from the origin station for up to 180 minutes or until the last train, whichever is earlier.</li>
        </ul>
      </div>
    </div>
  );
}
