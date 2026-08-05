// Server-side rent stats for the /rent SEO pages. Talks to Supabase directly
// (read-only anon key) and NEVER falls back to demo/seed data - a page with
// no reports says so instead of publishing made-up numbers.
import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { Area, areaBounds } from "./areas";
import { median } from "./stats";
import { Bhk, BHK_OPTIONS, RentPin } from "./types";

const PIN_COLS =
  "id, lat, lng, rent, deposit, bhk, housing_type, furnishing, maintenance_included, gated, tenant_type, pets, parking_count, sqft, society, note, rating_sum, rating_count, report_count, created_at";

const PAGE = 1000;

/**
 * All visible pins, fetched once per render and shared between
 * generateMetadata and the page via React's request cache.
 * Returns null when Supabase isn't configured (local dev without env).
 */
export const fetchAllPinsServer = cache(async (): Promise<RentPin[] | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  // Next's Data Cache would otherwise store the Supabase response forever
  // (even across builds); revalidate it on the same clock as the pages.
  const supabase = createClient(url, anonKey, {
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, next: { revalidate: 3600 } } as RequestInit),
    },
  });
  const all: RentPin[] = [];
  // PostgREST caps responses at 1,000 rows, so page through (see lib/data.ts).
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await supabase
      .from("rent_pins")
      .select(PIN_COLS)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return all.length ? all : null;
    all.push(...(data as unknown as RentPin[]));
    if (data.length < PAGE) break;
  }
  return all;
});

export interface AreaBhkStat {
  bhk: Bhk;
  count: number;
  medianRent: number;
  medianDeposit: number | null;
  furnishedMedianRent: number | null;
  unfurnishedMedianRent: number | null;
}

export interface AreaStats {
  /** null = Supabase not configured; count 0 = configured but no reports yet */
  available: boolean;
  count: number;
  byBhk: AreaBhkStat[];
  bachelorCount: number;
  familyCount: number;
  /** Median across the whole area, all BHKs. */
  medianRent: number | null;
  latestReport: string | null;
}

export function computeAreaStats(pins: RentPin[] | null, area: Area): AreaStats {
  if (pins === null) {
    return {
      available: false,
      count: 0,
      byBhk: [],
      bachelorCount: 0,
      familyCount: 0,
      medianRent: null,
      latestReport: null,
    };
  }
  const b = areaBounds(area);
  const inArea = pins.filter(
    (p) => p.lat <= b.north && p.lat >= b.south && p.lng <= b.east && p.lng >= b.west
  );
  const byBhk: AreaBhkStat[] = BHK_OPTIONS.flatMap((bhk) => {
    const group = inArea.filter((p) => p.bhk === bhk);
    if (group.length === 0) return [];
    const furnished = group.filter((p) => p.furnishing === "Furnished").map((p) => p.rent);
    const unfurnished = group.filter((p) => p.furnishing === "Unfurnished").map((p) => p.rent);
    return [
      {
        bhk,
        count: group.length,
        medianRent: median(group.map((p) => p.rent))!,
        medianDeposit: median(group.filter((p) => p.deposit != null).map((p) => p.deposit!)),
        furnishedMedianRent: median(furnished),
        unfurnishedMedianRent: median(unfurnished),
      },
    ];
  });
  return {
    available: true,
    count: inArea.length,
    byBhk,
    bachelorCount: inArea.filter((p) => p.tenant_type === "Bachelor").length,
    familyCount: inArea.filter((p) => p.tenant_type === "Family").length,
    medianRent: median(inArea.map((p) => p.rent)),
    latestReport: inArea.length ? inArea[0].created_at : null,
  };
}

export function bhkLabel(bhk: Bhk): string {
  return bhk === "1RK" ? "1 RK" : bhk === "4BHK+" ? "4 BHK+" : bhk.replace("BHK", " BHK");
}
