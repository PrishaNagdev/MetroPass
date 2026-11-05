import { Check } from "lucide-react";

const STEPS = ["Book", "Pay", "Ride"];

export default function Stepper({ step }: { step: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center justify-center gap-2 bg-white px-4 py-4 shadow-sm sm:gap-4" aria-label="Booking progress">
      {STEPS.map((s, i) => {
        const isCompleted = i < step || (step === 2 && i === 2);
        const isCurrent = i === step && step !== 2;
        const isRideActive = step === 2 && i === 2;

        return (
          <li key={s} className="flex items-center gap-2 sm:gap-4" aria-current={i === step ? "step" : undefined}>
            <span
              className={`grid h-8 w-8 place-items-center rounded-full text-white sm:h-9 sm:w-9 font-semibold text-sm transition-all duration-300 ${
                isRideActive
                  ? "bg-emerald-600 ring-4 ring-emerald-100 shadow-sm"
                  : isCompleted
                  ? "bg-brand text-white shadow-sm"
                  : isCurrent
                  ? "bg-brand text-white ring-4 ring-brand/20"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {isCompleted ? <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" /> : i + 1}
            </span>
            <span
              className={`text-sm sm:text-base font-semibold ${
                isRideActive
                  ? "text-emerald-700"
                  : i <= step
                  ? "text-slate-900"
                  : "text-slate-400"
              }`}
            >
              {s}
            </span>
            {i < 2 && (
              <span
                className={`h-0.5 w-8 sm:w-20 transition-all duration-300 ${
                  i < step ? "bg-brand" : "bg-slate-200"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
