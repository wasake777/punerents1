import { Bhk, BHK_OPTIONS, RentPin } from "./types";

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function pinsInBounds(pins: RentPin[], b: Bounds): RentPin[] {
  return pins.filter(
    (p) => p.lat <= b.north && p.lat >= b.south && p.lng <= b.east && p.lng >= b.west
  );
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface BhkStat {
  bhk: Bhk;
  count: number;
  medianRent: number;
  avgRent: number;
  medianDeposit: number | null;
}

export function statsByBhk(pins: RentPin[]): BhkStat[] {
  // Single pass over the pins instead of one filter per BHK option - this
  // runs on every map pan, over every pin in view.
  const groups = new Map<Bhk, RentPin[]>();
  for (const p of pins) {
    const group = groups.get(p.bhk);
    if (group) group.push(p);
    else groups.set(p.bhk, [p]);
  }
  return BHK_OPTIONS.flatMap((bhk) => {
    const group = groups.get(bhk);
    if (!group) return [];
    return [
      {
        bhk,
        count: group.length,
        medianRent: median(group.map((p) => p.rent))!,
        avgRent: Math.round(
          group.reduce((sum, p) => sum + p.rent, 0) / group.length
        ),
        medianDeposit: median(
          group.filter((p) => p.deposit != null).map((p) => p.deposit!)
        ),
      },
    ];
  });
}

// --- Leaderboard: highest rent normalized per BHK ----------------------------

/** Room-count equivalents used to normalize rents across flat sizes. */
export const BHK_UNITS: Record<Bhk, number> = {
  "1RK": 0.5,
  "1BHK": 1,
  "2BHK": 2,
  "3BHK": 3,
  "4BHK+": 4,
};

export interface LeaderboardEntry {
  pin: RentPin;
  /** rent ÷ BHK units, rounded - what a single BHK "costs" in this flat. */
  perBhk: number;
}

/**
 * Top `n` pins by rent-per-BHK. Flagged pins are excluded: a leaderboard is
 * exactly where a single spam entry ("₹1.5L for a 1BHK") would end up.
 */
export function leaderboard(pins: RentPin[], n = 5): LeaderboardEntry[] {
  return pins
    .filter((p) => p.report_count === 0)
    .map((p) => ({ pin: p, perBhk: Math.round(p.rent / BHK_UNITS[p.bhk]) }))
    .sort((a, b) => b.perBhk - a.perBhk || b.pin.rent - a.pin.rent)
    .slice(0, n);
}

export { formatINR } from "./format";
