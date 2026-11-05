"use client";
import {
  House,
  QrCode,
  Ticket,
  UserRound,
  ShieldCheck,
  Play,
  Route,
  IndianRupee,
  Train,
} from "lucide-react";

export type Tab = "home" | "book" | "active" | "inspector" | "fare" | "stations" | "planner";

const DESKTOP_ITEMS: {
  id: Tab;
  label: string;
  shortLabel: string;
  Icon: typeof House;
}[] = [
  { id: "home", label: "Home", shortLabel: "Home", Icon: House },
  { id: "book", label: "Book Ticket", shortLabel: "Book", Icon: QrCode },
  { id: "planner", label: "Journey Planner", shortLabel: "Planner", Icon: Route },
  { id: "fare", label: "Fare Enquiry", shortLabel: "Fare", Icon: IndianRupee },
  { id: "stations", label: "Station List", shortLabel: "Stations", Icon: Train },
  { id: "active", label: "View Ticket", shortLabel: "Tickets", Icon: Ticket },
  { id: "inspector", label: "TC Portal", shortLabel: "TC Portal", Icon: ShieldCheck },
];

const MOBILE_ITEMS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: "home", label: "Home", Icon: House },
  { id: "book", label: "Book Ticket", Icon: QrCode },
  { id: "active", label: "View Ticket", Icon: Ticket },
  { id: "inspector", label: "TC Portal", Icon: ShieldCheck },
];

export default function Header({
  tab,
  onTab,
  count,
  onReplayIntro,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  count: number;
  onReplayIntro?: () => void;
}) {
  const isSubPage = ["fare", "stations", "planner"].includes(tab);

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full min-w-full bg-[#EA580C] text-white shadow-md border-b border-orange-700/50 transition-colors ${
          isSubPage ? "hidden md:block" : ""
        }`}
      >
        <div className="flex w-full items-center justify-between px-3 sm:px-5 lg:px-7 py-2.5 sm:py-3 gap-2 sm:gap-4">
          {/* Brand Logo & Title with clear separator */}
          <button
            onClick={() => onTab("home")}
            className="flex shrink-0 items-center gap-2.5 sm:gap-3 mr-1 sm:mr-2 lg:mr-4 border-r border-white/25 pr-3 sm:pr-4 lg:pr-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white text-left group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Ahmedabad Metro"
              className="h-9 sm:h-10 w-auto shrink-0 object-contain bg-white rounded-lg p-0.5 shadow-sm group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col whitespace-nowrap">
              <span className="text-sm sm:text-base lg:text-lg font-extrabold tracking-tight leading-tight">
                Ahmedabad Metro
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-orange-100 tracking-wider uppercase">
                MetroPass • આપણી મેટ્રો
              </span>
            </div>
          </button>

          {/* Desktop Navigation Tabs (Responsive with short labels on laptop screens) */}
          <nav
            className="hidden md:flex items-center gap-1 xl:gap-1.5 flex-wrap lg:flex-nowrap justify-center min-w-0"
            aria-label="Main"
          >
            {DESKTOP_ITEMS.map(({ id, label, shortLabel, Icon }) => (
              <button
                key={id}
                onClick={() => onTab(id)}
                aria-current={tab === id}
                title={label}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 sm:px-2.5 xl:px-3 py-1.5 text-xs lg:text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                  tab === id
                    ? "bg-white text-[#EA580C] shadow-sm font-semibold"
                    : "hover:bg-white/15 text-white/90"
                }`}
              >
                <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4 shrink-0" />
                <span className="hidden xl:inline">{label}</span>
                <span className="inline xl:hidden">{shortLabel}</span>
                {id === "active" && count > 0 && (
                  <span className="rounded-full bg-[#EA580C] px-1.5 text-[10px] text-white ring-1 ring-white">
                    {count}
                  </span>
                )}
                {id === "inspector" && (
                  <span className="hidden sm:inline rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-bold uppercase text-slate-900 tracking-wider">
                    Official
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right Controls: Intro Button + System Online + User Profile */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {onReplayIntro && (
              <button
                onClick={onReplayIntro}
                title="Play Intro Logo Video"
                className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-black/15 hover:bg-black/25 px-2.5 sm:px-3 py-1 text-xs font-semibold text-white transition backdrop-blur-sm border border-white/20 shadow-xs"
              >
                <Play className="h-3 w-3 fill-white" />
                <span className="hidden lg:inline">Intro Video</span>
                <span className="inline lg:hidden">Intro</span>
              </button>
            )}
            <span className="inline-flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-full bg-black/20 px-2.5 sm:px-3 py-1 text-xs font-bold text-white shadow-xs border border-white/25">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-xs" />
              </span>
              <span className="whitespace-nowrap">System Online</span>
            </span>
            <div
              title="Official Portal Profile"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/15 border border-white/25 text-white shadow-xs"
            >
              <UserRound className="h-4 w-4 opacity-90" aria-hidden />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white md:hidden shadow-lg" aria-label="Main">
        {MOBILE_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onTab(id)}
            aria-current={tab === id}
            className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
              tab === id ? "text-brand font-semibold" : "text-slate-600"
            }`}
          >
            <span className={`rounded-full px-4 py-1 relative ${tab === id ? "bg-brand-tint" : ""}`}>
              <Icon className="h-5 w-5" />
              {id === "inspector" && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </span>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
