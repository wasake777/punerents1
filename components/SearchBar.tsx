"use client";

import { useEffect, useRef, useState } from "react";
import { inPMR, loadGoogleLibrary, mapsConfigured, PMR_BOUNDS } from "@/lib/googlemaps";

interface Result {
  display_name: string;
  lat: number;
  lng: number;
}

interface Props {
  onGo: (lat: number, lng: number) => void;
  onLocate: () => void;
  /** Replaces the search icon inside the pill (e.g. the brand mark on mobile). */
  leading?: React.ReactNode;
  /** Rendered at the right edge of the pill (e.g. the mobile ⋮ menu button). */
  trailing?: React.ReactNode;
}

// Nominatim fallback for keyless dev, restricted to the same PMR viewbox.
const NOMINATIM_URL =
  "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&bounded=1&viewbox=72.6,19.5,73.35,18.75&q=";

// Google Geocoding via the shared JS API loader; biased to the PMR bounds and
// filtered to results actually inside them (bounds are a bias, not a fence).
async function googleSearch(query: string): Promise<Result[]> {
  const { Geocoder } = await loadGoogleLibrary("geocoding");
  try {
    const { results } = await new Geocoder().geocode({
      address: query,
      bounds: PMR_BOUNDS,
      region: "in",
    });
    return results
      .map((r) => ({
        display_name: r.formatted_address,
        lat: r.geometry.location.lat(),
        lng: r.geometry.location.lng(),
      }))
      .filter((r) => inPMR(r.lat, r.lng))
      .slice(0, 5);
  } catch (err) {
    // The geocoder rejects with ZERO_RESULTS instead of returning []; any
    // other status (REQUEST_DENIED, OVER_QUERY_LIMIT…) is a real error.
    if (String(err).includes("ZERO_RESULTS")) return [];
    throw err;
  }
}

async function nominatimSearch(query: string, signal: AbortSignal): Promise<Result[]> {
  const res = await fetch(NOMINATIM_URL + encodeURIComponent(query), { signal });
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({
    display_name: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

export default function SearchBar({ onGo, onLocate, leading, trailing }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  // Set when we programmatically fill the input (picking a result), so the
  // debounced effect doesn't immediately re-search the picked name.
  const skipNextRef = useRef(false);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) {
        setResults(null);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const runSearch = async (q: string) => {
    // A newer search supersedes an in-flight one; otherwise two quick
    // searches can resolve out of order and show stale results. (The Google
    // geocoder can't be aborted, so a sequence number guards both paths.)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;
    setSearching(true);
    setFailed(false);
    try {
      const found = mapsConfigured
        ? await googleSearch(q)
        : await nominatimSearch(q, controller.signal);
      if (seq === seqRef.current) setResults(found);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Search failed:", err);
      if (seq === seqRef.current) {
        setResults(null);
        setFailed(true);
      }
    } finally {
      if (seq === seqRef.current) setSearching(false);
    }
  };

  // Google-style search-as-you-type: debounced, min 3 chars.
  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      setResults(null);
      setFailed(false);
      return;
    }
    const t = setTimeout(() => void runSearch(q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) void runSearch(q);
  };

  const locate = () => {
    onLocate();
    setResults(null);
    setOpen(false);
  };

  const clear = () => {
    setQuery("");
    setResults(null);
    setFailed(false);
  };

  return (
    <div ref={boxRef} className="pointer-events-auto relative w-full">
      <form
        onSubmit={search}
        className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 shadow-md shadow-slate-900/10 ring-1 ring-slate-900/10 backdrop-blur-md transition focus-within:ring-2 focus-within:ring-emerald-500 dark:bg-slate-800/90 dark:ring-white/10"
      >
        {leading ?? (
          <svg
            className="pointer-events-none h-4 w-4 shrink-0 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        )}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search neighbourhood or area…"
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="shrink-0 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        )}
        {trailing}
      </form>
      {searching && (
        <p className="absolute mt-1.5 w-full rounded-2xl bg-white px-3.5 py-2.5 text-xs text-slate-400 shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/10 dark:bg-slate-800 dark:ring-white/10">
          Searching…
        </p>
      )}
      {(open || results) && !searching && (
        <div className="absolute z-20 mt-1.5 w-full rounded-2xl bg-white p-1.5 shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/10 dark:bg-slate-800 dark:ring-white/10">
          <button
            onClick={locate}
            className="block w-full rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
          >
            📍 Use my current location
          </button>
          {failed && (
            <p className="px-2.5 py-2 text-xs text-red-500">
              Search is unavailable right now - try again in a moment.
            </p>
          )}
          {results?.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-slate-400">
              Nothing found inside Pune / Pimpri-Chinchwad.
            </p>
          )}
          {results?.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                onGo(r.lat, r.lng);
                setResults(null);
                setOpen(false);
                skipNextRef.current = true;
                setQuery(r.display_name.split(",")[0]);
              }}
              className="block w-full truncate rounded-xl px-2.5 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
