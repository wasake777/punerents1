import { Bhk, HousingType, RentPin } from "./types";

// Locality anchors with a plausible 1BHK base rent (₹/month). Other BHKs are
// derived from it. Purely illustrative demo data shown until Supabase is
// connected - clearly labelled as such in the UI.
const ANCHORS: [name: string, lat: number, lng: number, base1bhk: number][] = [
  // Pune
  ["Koregaon Park", 18.5362, 73.893, 26000],
  ["Kalyani Nagar", 18.549, 73.903, 23000],
  ["Viman Nagar", 18.5679, 73.9143, 20000],
  ["Kharadi", 18.5515, 73.9345, 19000],
  ["Magarpatta", 18.515, 73.927, 18000],
  ["Hadapsar", 18.5089, 73.926, 15000],
  ["Kothrud", 18.5074, 73.8077, 16000],
  ["Karve Nagar", 18.4887, 73.816, 14000],
  ["Baner", 18.559, 73.7868, 18000],
  ["Aundh", 18.56, 73.807, 19000],
  ["Deccan Gymkhana", 18.5178, 73.8412, 18000],
  ["Camp", 18.512, 73.879, 18000],
  ["Hinjewadi", 18.5913, 73.7389, 17000],
  ["Wagholi", 18.582, 74.003, 12000],
  ["Undri", 18.458, 73.912, 12000],
  ["Katraj", 18.4529, 73.866, 11000],
  ["Sinhagad Road", 18.46, 73.815, 12000],
  ["Kondhwa", 18.462, 73.889, 12000],
  // Pimpri-Chinchwad
  ["Wakad", 18.599, 73.762, 16000],
  ["Pimple Saudagar", 18.59, 73.789, 15000],
  ["Pimpri", 18.622, 73.805, 13000],
  ["Chinchwad", 18.629, 73.781, 13000],
  ["Nigdi", 18.659, 73.769, 11000],
  ["Ravet", 18.646, 73.742, 12000],
];

const BHK_MULT: [Bhk, number][] = [
  ["1RK", 0.62],
  ["1BHK", 1.0],
  ["2BHK", 1.65],
  ["3BHK", 2.5],
  ["4BHK+", 3.6],
];

const NOTES = [
  "Great locality, noisy at night",
  "Peaceful lane, 5 min to metro",
  "Water issues in summer",
  "Friendly society, strict on visitors",
  "Close to market, gets crowded",
];

const HOUSING: HousingType[] = [
  "Society",
  "Society",
  "Society",
  "Standalone building",
  "Wada",
  "Gaothan/Village",
];

// Deterministic pseudo-random so the demo map looks the same on every load.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSeedPins(): RentPin[] {
  const rand = mulberry32(20260714);
  const pins: RentPin[] = [];
  ANCHORS.forEach(([name, lat, lng, base], ai) => {
    const count = 4 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const [bhk, mult] = BHK_MULT[Math.floor(rand() * BHK_MULT.length)];
      const noise = 0.82 + rand() * 0.36;
      const rent = Math.round((base * mult * noise) / 500) * 500;
      const monthsDeposit = 2 + Math.floor(rand() * 4);
      const housing_type = HOUSING[Math.floor(rand() * HOUSING.length)];
      const sqftBase = { "1RK": 250, "1BHK": 450, "2BHK": 750, "3BHK": 1100, "4BHK+": 1600 }[bhk];
      pins.push({
        id: `seed-${ai}-${i}`,
        lat: +(lat + (rand() - 0.5) * 0.014).toFixed(3),
        lng: +(lng + (rand() - 0.5) * 0.014).toFixed(3),
        rent,
        deposit: rand() < 0.8 ? rent * monthsDeposit : null,
        bhk,
        housing_type,
        furnishing: rand() < 0.7 ? (rand() < 0.5 ? "Furnished" : "Unfurnished") : null,
        maintenance_included: rand() < 0.6 ? rand() < 0.5 : null,
        gated: housing_type === "Society" ? rand() < 0.85 : rand() < 0.2,
        tenant_type: rand() < 0.5 ? (rand() < 0.6 ? "Family" : "Bachelor") : null,
        pets: rand() < 0.4 ? (["Yes", "No", "Not sure"] as const)[Math.floor(rand() * 3)] : null,
        parking_count: rand() < 0.6 ? Math.floor(rand() * 3) : null,
        sqft: rand() < 0.5 ? Math.round((sqftBase * (0.85 + rand() * 0.4)) / 10) * 10 : null,
        society: null,
        note: rand() < 0.25 ? NOTES[Math.floor(rand() * NOTES.length)] : null,
        ...(() => {
          const count = rand() < 0.35 ? 1 + Math.floor(rand() * 8) : 0;
          const avg = 3 + rand() * 2;
          return {
            rating_count: count,
            rating_sum: count ? Math.round(avg * count) : 0,
            report_count: rand() < 0.06 ? 1 + Math.floor(rand() * 2) : 0,
          };
        })(),
        created_at: `2026-0${1 + Math.floor(rand() * 6)}-15T00:00:00.000Z`,
      });
    }
    void name;
  });
  return pins;
}
