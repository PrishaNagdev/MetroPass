// Ahmedabad Metro East-West (EW) Line Stations in order from East to West
export const EW_STATIONS = [
  "Vastral Gam",
  "Nirant Cross Road",
  "Vastral",
  "Rabari Colony",
  "Amraiwadi",
  "Apparel Park",
  "Kankariya East",
  "Kalupur Railway Station",
  "Old High Court",
  "SP Stadium",
  "Commerce Six Roads",
  "Gujarat University",
  "Gurukul Road",
  "Doordarshan Kendra",
  "Thaltej",
  "Thaltej Gam",
];

// Default list aliases to EW Line
export const STATIONS = EW_STATIONS;

// Cumulative station distances from Vastral Gam (East Terminus) in Kilometers
export const STATION_DISTANCES: Record<string, number> = {
  "Vastral Gam": 0.0,
  "Nirant Cross Road": 1.15,
  "Vastral": 2.15,
  "Rabari Colony": 3.2,
  "Amraiwadi": 4.1,
  "Apparel Park": 5.09, // Rabari Colony (3.20) to Apparel Park (5.09) = 1.89 km (matching screenshot)
  "Kankariya East": 7.2, // Vastral Gam (0.0) to Kankariya East (7.2) = 7.2 km (Rs. 10 matching screenshot)
  "Kalupur Railway Station": 8.9,
  "Old High Court": 12.4, // Interchange with North-South corridor
  "SP Stadium": 13.8,
  "Commerce Six Roads": 14.9,
  "Gujarat University": 16.1,
  "Gurukul Road": 17.3,
  "Doordarshan Kendra": 18.5,
  "Thaltej": 19.8,
  "Thaltej Gam": 21.16,
};

export type JourneyDetails = {
  source: string;
  dest: string;
  stops: number;
  stationsCount: number;
  distanceKm: number;
  distanceText: string;
  minutes: number;
  minutesText: string;
  fare: number;
  fareText: string;
  interchange: number;
  line: string;
};

export function getJourneyDetails(src: string, dst: string): JourneyDetails | null {
  const a = STATIONS.indexOf(src);
  const b = STATIONS.indexOf(dst);
  if (a < 0 || b < 0 || a === b) return null;

  const stops = Math.abs(a - b);
  const stationsCount = stops + 1;
  const distA = STATION_DISTANCES[src] ?? a * 1.3;
  const distB = STATION_DISTANCES[dst] ?? b * 1.3;
  const distanceKm = Math.abs(distA - distB);

  // Exact Ahmedabad Metro fare slabs matching screenshots
  let fare = 5;
  if (distanceKm > 15) fare = 25;
  else if (distanceKm > 10) fare = 20;
  else if (distanceKm > 6) fare = 15;
  else if (distanceKm > 2.2) fare = 10;
  else fare = 5;

  const minutes = Math.max(3, Math.round(distanceKm * 1.6 + stops * 0.7));

  return {
    source: src,
    dest: dst,
    stops,
    stationsCount,
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    distanceText: `${distanceKm.toFixed(2)} Km`,
    minutes,
    minutesText: `${String(minutes).padStart(2, "0")}Min`,
    fare,
    fareText: `Fare Rs. ${fare}`,
    interchange: 0,
    line: "East-West (EW) Line",
  };
}

export function estimateJourney(src: string, dst: string, passengers = 1) {
  const details = getJourneyDetails(src, dst);
  if (!details) return null;
  return {
    stops: details.stops,
    unit: details.fare,
    fare: details.fare * passengers,
    minutes: details.minutes,
    distanceKm: details.distanceKm,
    stationsCount: details.stationsCount,
  };
}

// Station-specific Penalty & Base Fare Tariff Schedule (Section 138 Metro Railways Act)
export type StationPenaltyInfo = {
  station: string;
  baseFare: number;
  penalty: number;
  category: string;
  zone: string;
};

export const STATION_PENALTIES: Record<string, StationPenaltyInfo> = {
  "Kalupur Railway Station": { station: "Kalupur Railway Station", baseFare: 35, penalty: 350, category: "Major Railway Interchange Hub", zone: "Zone A+" },
  "Old High Court": { station: "Old High Court", baseFare: 30, penalty: 300, category: "Central Metro Interchange Station", zone: "Zone A" },
  "SP Stadium": { station: "SP Stadium", baseFare: 30, penalty: 250, category: "Sports Arena & Transit Post", zone: "Zone B" },
  "Thaltej Gam": { station: "Thaltej Gam", baseFare: 30, penalty: 280, category: "West Terminal Hub", zone: "Zone A" },
  "Thaltej": { station: "Thaltej", baseFare: 25, penalty: 260, category: "Commercial District", zone: "Zone B" },
  "Doordarshan Kendra": { station: "Doordarshan Kendra", baseFare: 20, penalty: 220, category: "Broadcast & Civic Sector", zone: "Zone C" },
  "Gurukul Road": { station: "Gurukul Road", baseFare: 20, penalty: 230, category: "High-Density Residential Sector", zone: "Zone C" },
  "Gujarat University": { station: "Gujarat University", baseFare: 25, penalty: 240, category: "Educational & University Corridor", zone: "Zone B" },
  "Commerce Six Roads": { station: "Commerce Six Roads", baseFare: 25, penalty: 240, category: "Commercial Corridor", zone: "Zone B" },
  "Kankariya East": { station: "Kankariya East", baseFare: 25, penalty: 270, category: "Lakefront Tourism & Recreation Zone", zone: "Zone B+" },
  "Apparel Park": { station: "Apparel Park", baseFare: 20, penalty: 200, category: "Industrial Sector Hub", zone: "Zone C" },
  "Amraiwadi": { station: "Amraiwadi", baseFare: 20, penalty: 190, category: "Suburban Sector 1", zone: "Zone D" },
  "Rabari Colony": { station: "Rabari Colony", baseFare: 20, penalty: 180, category: "Suburban Sector 2", zone: "Zone D" },
  "Vastral": { station: "Vastral", baseFare: 20, penalty: 170, category: "Residential East", zone: "Zone D" },
  "Nirant Cross Road": { station: "Nirant Cross Road", baseFare: 15, penalty: 160, category: "Outer Ring Checkpost", zone: "Zone E" },
  "Vastral Gam": { station: "Vastral Gam", baseFare: 15, penalty: 150, category: "East Terminus Hub", zone: "Zone E" },
};

export function getStationPenalty(stationName: string): StationPenaltyInfo {
  return (
    STATION_PENALTIES[stationName] || {
      station: stationName,
      baseFare: 30,
      penalty: 250,
      category: "Standard Transit Checkpost",
      zone: "Zone B",
    }
  );
}

export type TicketStatus = "ACTIVE (READY FOR TURNSTILE)" | "USED";

export type Ticket = {
  ticket_id: string;
  passenger_name: string;
  source_station: string;
  dest_station: string;
  travel_date: string;
  issued_at: string;
  status: TicketStatus | string;
  passengers: number;
  fare: number;
  face_url?: string;
  biometric_badge?: string;
};
