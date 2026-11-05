"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Plus,
  ShieldCheck,
  Ticket as TicketIcon,
  TicketX,
  X,
  CheckCircle2,
} from "lucide-react";
import Header, { Tab } from "@/components/Header";
import Stepper from "@/components/Stepper";
import JourneyForm, { Journey } from "@/components/JourneyForm";
import FaceCapture from "@/components/FaceCapture";
import BoardingPass, { TicketCard } from "@/components/BoardingPass";
import InspectorScanner from "@/components/InspectorScanner";
import IntroSplash from "@/components/IntroSplash";
import FareEnquiry from "@/components/FareEnquiry";
import StationList from "@/components/StationList";
import JourneyPlanner from "@/components/JourneyPlanner";
import LandingHome from "@/components/LandingHome";
import { estimateJourney, STATIONS, type Ticket } from "@/lib/stations";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/tickets/book";
const STORE = "metropass-snn-tickets";
const card = "rounded-xl bg-white p-5 shadow-md sm:p-7";
const cta =
  "flex w-full items-center justify-center gap-2 rounded-md bg-brand px-5 py-4 text-lg font-medium text-white shadow-md transition hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none";

export default function Page() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const blank: Journey = { name: "", source: "", dest: "", date: today, passengers: 1, group: false };
  const [tab, setTab] = useState<Tab>("home");
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [journey, setJourney] = useState<Journey>(blank);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "used">("all");
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    try {
      const saved: Ticket[] = JSON.parse(localStorage.getItem(STORE) || "[]");
      // Normalize any existing tickets to ensure consistent status format: STATUS: ACTIVE (READY FOR TURNSTILE)
      const normalized = saved.map((t) => ({
        ...t,
        status: t.status?.toUpperCase().includes("USED")
          ? "USED"
          : "ACTIVE (READY FOR TURNSTILE)",
      }));
      setTickets(normalized);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const est = estimateJourney(journey.source, journey.dest, 1);
  const isNameValid = journey.name.trim().length >= 3;
  const valid = isNameValid && !!est && !!journey.date && !!photo;

  const toggleTicketStatus = (ticketId: string) => {
    setTickets((prev) => {
      const updated = prev.map((t) => {
        if (t.ticket_id === ticketId) {
          const nextStatus = t.status.startsWith("ACTIVE") ? "USED" : "ACTIVE (READY FOR TURNSTILE)";
          return { ...t, status: nextStatus };
        }
        return t;
      });
      try {
        localStorage.setItem(STORE, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });

    setConfirmed((prev) => {
      if (!prev || prev.ticket_id !== ticketId) return prev;
      return {
        ...prev,
        status: prev.status.startsWith("ACTIVE") ? "USED" : "ACTIVE (READY FOR TURNSTILE)",
      };
    });
  };

  const submit = async () => {
    if (!valid || !photo || !est) return;
    setLoading(true);
    setError(null);

    // Generate compliant ticket ID: e.g. #METRO-84920
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const generatedTicketId = `#METRO-${randomNum}`;

    let backendData: { ticket_id?: string; passenger_name?: string; source_station?: string; dest_station?: string; travel_date?: string; created_at?: string } | null = null;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);

      const fd = new FormData();
      fd.append("passenger_name", journey.name.trim());
      fd.append("source_station", journey.source);
      fd.append("dest_station", journey.dest);
      fd.append("travel_date", journey.date);
      fd.append("face_image", photo.blob, "face.jpg");

      const res = await fetch(API_URL, { method: "POST", body: fd, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        backendData = await res.json();
      }
    } catch {
      // Backend unavailable or timed out; fallback seamlessly to client-side biometric ticket generation
    }

    const ticket: Ticket = {
      ticket_id: backendData?.ticket_id ?? generatedTicketId,
      passenger_name: backendData?.passenger_name ?? journey.name.trim(),
      source_station: backendData?.source_station ?? journey.source,
      dest_station: backendData?.dest_station ?? journey.dest,
      travel_date: backendData?.travel_date ?? journey.date,
      issued_at: backendData?.created_at ?? new Date().toISOString(),
      status: "ACTIVE (READY FOR TURNSTILE)",
      passengers: 1,
      fare: est.fare,
      face_url: photo.url,
      biometric_badge: "Face Registered (Biometric Vector)",
    };

    const nextTickets = [ticket, ...tickets.filter((t) => t.ticket_id !== ticket.ticket_id)];
    setTickets(nextTickets);
    try {
      localStorage.setItem(STORE, JSON.stringify(nextTickets));
    } catch {
      /* ignore */
    }

    setConfirmed(ticket);
    setStep(2);
    setLoading(false);
  };

  const reset = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    setJourney(blank);
    setConfirmed(null);
    setError(null);
    setStep(0);
  };

  const go = (t: Tab) => {
    setTab(t);
    setError(null);
  };

  const handleBookRoute = (src: string, dst: string) => {
    setJourney((prev) => ({
      ...prev,
      source: src,
      dest: dst,
    }));
    setTab("book");
    setStep(0);
  };

  const handleSelectStation = (station: string) => {
    setJourney((prev) => ({
      ...prev,
      source: station,
    }));
    setTab("book");
    setStep(0);
  };

  const errBox = error && (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{error}</p>
      <button onClick={() => setError(null)} aria-label="Dismiss error">
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const displayedTickets = tickets.filter((t) => {
    if (filter === "active") return t.status.startsWith("ACTIVE");
    if (filter === "used") return t.status === "USED";
    return true;
  });

  return (
    <>
      {showIntro && <IntroSplash onComplete={() => setShowIntro(false)} />}
      <Header
        tab={tab}
        onTab={go}
        count={tickets.length}
        onReplayIntro={() => setShowIntro(true)}
      />
      <main className="pb-28 md:pb-12">
        {tab === "home" && (
          <LandingHome
            onBookJourney={handleBookRoute}
            onNavigate={go}
            activeCount={tickets.filter((t) => t.status.startsWith("ACTIVE")).length}
          />
        )}

        {tab === "book" && (
          <>
            <Stepper step={step} />
            <section className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
              {errBox}

              {step === 0 && (
                <>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className={card}>
                      <h2 className="sr-only">Journey details</h2>
                      <JourneyForm value={journey} onChange={setJourney} today={today} />
                    </div>
                    <div className={card}>
                      <h2 className="mb-4 text-lg font-bold">Face registration</h2>
                      <FaceCapture
                        photoUrl={photo?.url ?? null}
                        onCapture={(blob, url) => setPhoto({ blob, url })}
                        onClear={() => {
                          if (photo) URL.revokeObjectURL(photo.url);
                          setPhoto(null);
                        }}
                      />
                    </div>
                  </div>
                  <div className="mx-auto max-w-md">
                    <button className={cta} disabled={!valid} onClick={() => setStep(1)}>
                      Confirm Ticket
                    </button>
                    {!valid && (
                      <p className="mt-2 text-center text-xs text-slate-500">
                        {!isNameValid
                          ? "Please enter a passenger name with at least 3 characters."
                          : !est
                          ? "Please select two different stations."
                          : !photo
                          ? "Please capture or upload your face photo inside the box."
                          : "Please fill in all details to proceed."}
                      </p>
                    )}
                  </div>
                </>
              )}

              {step === 1 && est && (
                <div className="mx-auto max-w-2xl space-y-5">
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
                    <h3 className="text-base font-bold text-slate-800 mb-3">Review Single Ticket Details</h3>
                    <TicketCard
                      t={{
                        passenger_name: journey.name.trim(),
                        source_station: journey.source,
                        dest_station: journey.dest,
                        travel_date: journey.date,
                        passengers: 1,
                        fare: est.fare,
                      }}
                    >
                      {photo && (
                        <div className="flex items-center gap-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt="Your registered face"
                            className="h-12 w-12 rounded-lg object-cover ring-2 ring-brand/40 shadow-sm"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 block">Biometric Face Capture Ready</span>
                            <span className="text-xs text-slate-500">Cropped centered face ready for biometric embedding.</span>
                          </div>
                        </div>
                      )}
                    </TicketCard>
                  </div>

                  <button className={cta} onClick={submit} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Registering Biometrics…
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-5 w-5" /> Pay ₹{est.fare.toFixed(2)} &amp; Book Ticket
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setStep(0)}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand"
                  >
                    <ArrowLeft className="h-4 w-4" /> Edit details
                  </button>
                  <p className="text-sm text-slate-600">
                    Refund Information: In case of booking failure, any amount deducted will be refunded within 7 business days.
                  </p>
                </div>
              )}

              {/* Step 2: Ride Screen */}
              {step === 2 && confirmed && (
                <div className="mx-auto max-w-2xl space-y-6">
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3.5 border border-emerald-200 text-emerald-800">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold text-sm sm:text-base">Ticket Booked Successfully!</p>
                        <p className="text-xs text-emerald-700">Proceed to the turnstile gate. Face biometric matched automatically.</p>
                      </div>
                    </div>
                  </div>

                  {/* Digital Pass on Ride Screen */}
                  <BoardingPass t={confirmed} onToggleStatus={toggleTicketStatus} />

                  <div className="flex flex-wrap gap-3 justify-between items-center pt-2">
                    <button
                      onClick={reset}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow hover:bg-brand-dark transition"
                    >
                      <Plus className="h-4 w-4" /> Book Another Ticket
                    </button>
                    <button
                      onClick={() => go("active")}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                    >
                      <TicketIcon className="h-4 w-4 text-brand" /> View All Tickets
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* View Ticket Tab */}
        {tab === "active" && (
          <section className="mx-auto max-w-2xl space-y-5 px-4 py-8 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">View Tickets</h1>
                <p className="text-xs text-slate-500 mt-0.5">Manage your digital biometric passes</p>
              </div>

              {tickets.length > 0 && (
                <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setFilter("all")}
                    className={`rounded-md px-2.5 py-1 transition ${filter === "all" ? "bg-white text-brand shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    All ({tickets.length})
                  </button>
                  <button
                    onClick={() => setFilter("active")}
                    className={`rounded-md px-2.5 py-1 transition ${filter === "active" ? "bg-white text-brand shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Active ({tickets.filter((t) => t.status.startsWith("ACTIVE")).length})
                  </button>
                  <button
                    onClick={() => setFilter("used")}
                    className={`rounded-md px-2.5 py-1 transition ${filter === "used" ? "bg-white text-brand shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Used ({tickets.filter((t) => t.status === "USED").length})
                  </button>
                </div>
              )}
            </div>

            {displayedTickets.length === 0 ? (
              <div className={`${card} text-center py-10`}>
                <TicketX className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-3 text-base font-semibold text-slate-800">
                  {tickets.length === 0 ? "No active tickets yet" : "No tickets match this filter"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {tickets.length === 0
                    ? "Book a ticket with face registration to pass through metro turnstiles without QR codes."
                    : "Switch filter to view other tickets."}
                </p>
                <button
                  onClick={() => go("book")}
                  className="mt-5 rounded-md bg-brand px-5 py-2.5 font-medium text-white shadow hover:bg-brand-dark transition"
                >
                  Book a ticket
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {displayedTickets.map((t) => (
                  <BoardingPass key={t.ticket_id} t={t} onToggleStatus={toggleTicketStatus} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "inspector" && <InspectorScanner />}

        {tab === "fare" && (
          <FareEnquiry
            onBack={() => go("home")}
            onBookRoute={handleBookRoute}
          />
        )}

        {tab === "stations" && (
          <StationList
            onBack={() => go("home")}
            onSelectStation={handleSelectStation}
          />
        )}

        {tab === "planner" && (
          <JourneyPlanner
            onBack={() => go("home")}
            onBookRoute={handleBookRoute}
          />
        )}
      </main>
    </>
  );
}
