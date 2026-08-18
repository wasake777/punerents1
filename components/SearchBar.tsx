"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { inPMR, loadGoogleLibrary, mapsConfigured, PMR_BOUNDS } from "@/lib/googlemaps";
import { Area, AREAS, distanceKm } from "@/lib/areas";

interface Result {
  display_name: string;
  lat: number;
  lng: number;
}

interface Recent {
  label: string;
  lat: number;
  lng: number;
  zoom?: number;
}

interface Props {
  onGo: (lat: number, lng: number, zoom?: number) => void;
  onLocate: () => void;
  /** Pins currently on the map - used to show live counts next to areas. */
  pins?: { lat: number; lng: number }[];
  /** Replaces the search icon inside the pill (e.g. the brand mark on mobile). */
  leading?: React.ReactNode;
  /** Rendered at the right edge of the pill (e.g. the mobile ⋮ menu button). */
  trailing?: React.ReactNode;
}

// One flat list drives keyboard navigation across every dropdown section.
type Option =
  | { kind: "locate" }
  | { kind: "recent"; recent: Recent }
  | { kind: "area"; area: Area; count: number }
  | { kind: "place"; place: Result };

const RECENTS_KEY = "punerents_recent_searches";
const AREA_ZOOM = 14;

// Shown before the first pin exists, so the empty state still teaches the
// city's rental geography instead of showing a blank panel.
const STARTER_AREAS = ["kothrud", "wakad", "kharadi", "baner", "viman-nagar", "hinjewadi"];

function loadRecents(): Recent[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENTS_KEY) ?? "[]");
    return Array.isArray(stored)
      ? stored.filter(
          (r): r is Recent =>
            !!r && typeof r.label === "string" && Number.isFinite(r.lat) && Number.isFinite(r.lng)
        )
      : [];
  } catch {
    return [];
  }
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

// Ranked match against the canonical area registry: exact-prefix beats
// word-prefix beats substring, ties broken by how much data an area has.
function matchAreas(query: string, counts: Map<string, number>): { area: Area; count: number }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { area: Area; count: number; score: number }[] = [];
  for (const area of AREAS) {
    const name = area.name.toLowerCase();
    let score: number;
    if (name.startsWith(q)) score = 0;
    else if (name.split(/[\s-]+/).some((w) => w.startsWith(q))) score = 1;
    else if (name.includes(q) || area.slug.includes(q.replace(/\s+/g, "-"))) score = 2;
    else continue;
    scored.push({ area, count: counts.get(area.slug) ?? 0, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || b.count - a.count)
    .slice(0, 5)
    .map(({ area, count }) => ({ area, count }));
}

// --- Dropdown row chrome -----------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
      {children}
    </p>
  );
}

function IconChip({ tone, children }: { tone: "emerald" | "slate"; children: React.ReactNode }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
        tone === "emerald"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          : "bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-300"
      }`}
    >
      {children}
    </span>
  );
}

const PinIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ClockIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const CrosshairIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

const PlaceIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export default function SearchBar({ onGo, onLocate, pins, leading, trailing }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  // Set when we programmatically fill the input (picking a result), so the
  // debounced effect doesn't immediately re-search the picked name.
  const skipNextRef = useRef(false);

  useEffect(() => {
    setRecents(loadRecents());
  }, []);

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

  // "/" focuses search from anywhere (unless the user is already typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live pins inside each area's radius; recomputed only when pins change.
  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!pins?.length) return counts;
    for (const area of AREAS) {
      let n = 0;
      for (const p of pins) if (distanceKm(area, p) <= area.radiusKm) n++;
      if (n > 0) counts.set(area.slug, n);
    }
    return counts;
  }, [pins]);

  const areaMatches = useMemo(() => matchAreas(query, areaCounts), [query, areaCounts]);

  // The empty-state shortlist: the areas with the most data, or a curated
  // starter set while the map is still empty.
  const popularAreas = useMemo(() => {
    const ranked = [...areaCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const areas = ranked
      .map(([slug, count]) => ({ area: AREAS.find((a) => a.slug === slug)!, count }))
      .filter((x) => x.area);
    if (areas.length >= 4) return areas;
    return STARTER_AREAS.map((slug) => ({
      area: AREAS.find((a) => a.slug === slug)!,
      count: areaCounts.get(slug) ?? 0,
    }));
  }, [areaCounts]);

  const hasQuery = query.trim().length > 0;

  // Flat option list in visual order - this is what ↑/↓ walk through.
  const options: Option[] = useMemo(() => {
    const list: Option[] = [{ kind: "locate" }];
    if (!hasQuery) {
      for (const recent of recents) list.push({ kind: "recent", recent });
      for (const { area, count } of popularAreas) list.push({ kind: "area", area, count });
    } else {
      for (const { area, count } of areaMatches) list.push({ kind: "area", area, count });
      for (const place of results ?? []) list.push({ kind: "place", place });
    }
    return list;
  }, [hasQuery, recents, popularAreas, areaMatches, results]);

  useEffect(() => setActive(-1), [query, results, open]);

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

  const saveRecent = (recent: Recent) => {
    setRecents((prev) => {
      const next = [recent, ...prev.filter((r) => r.label !== recent.label)].slice(0, 4);
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const closeDropdown = () => {
    // Supersede any in-flight geocode, or its late arrival would re-open the
    // dropdown by setting results after the pick.
    seqRef.current++;
    abortRef.current?.abort();
    setSearching(false);
    setResults(null);
    setOpen(false);
    setActive(-1);
  };

  const fillQuery = (label: string) => {
    skipNextRef.current = true;
    setQuery(label);
  };

  const pick = (o: Option) => {
    if (o.kind === "locate") {
      onLocate();
      closeDropdown();
      return;
    }
    if (o.kind === "area") {
      onGo(o.area.lat, o.area.lng, AREA_ZOOM);
      saveRecent({ label: o.area.name, lat: o.area.lat, lng: o.area.lng, zoom: AREA_ZOOM });
      fillQuery(o.area.name);
    } else if (o.kind === "recent") {
      onGo(o.recent.lat, o.recent.lng, o.recent.zoom);
      fillQuery(o.recent.label);
    } else {
      onGo(o.place.lat, o.place.lng);
      const label = o.place.display_name.split(",")[0];
      saveRecent({ label, lat: o.place.lat, lng: o.place.lng });
      fillQuery(label);
    }
    closeDropdown();
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      closeDropdown();
      inputRef.current?.blur();
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0 && options[active]) {
      e.preventDefault();
      pick(options[active]);
    }
  };

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    // With a highlighted or obvious top area match, Enter goes there directly.
    if (areaMatches.length > 0) {
      pick({ kind: "area", ...areaMatches[0] });
      return;
    }
    const q = query.trim();
    if (q) void runSearch(q);
  };

  const clear = () => {
    setQuery("");
    setResults(null);
    setFailed(false);
    inputRef.current?.focus();
  };

  // Rendered rows must agree with `options` order: locate, then the section
  // rows in the same sequence. `idx` tracks the flat index while rendering.
  let idx = 0;
  const row = (o: Option, content: React.ReactNode, className = "") => {
    const i = idx++;
    return (
      <button
        key={i + (o.kind === "area" ? o.area.slug : "")}
        id={`search-opt-${i}`}
        role="option"
        aria-selected={active === i}
        onClick={() => pick(o)}
        onMouseEnter={() => setActive(i)}
        className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
          active === i ? "bg-slate-100 dark:bg-slate-700/60" : ""
        } ${className}`}
      >
        {content}
      </button>
    );
  };

  const showDropdown = open || results !== null;

  return (
    <div ref={boxRef} className="pointer-events-auto relative w-full">
      <form
        onSubmit={search}
        className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/15 backdrop-blur-md transition focus-within:ring-2 focus-within:ring-emerald-500 dark:bg-slate-800/95 dark:ring-white/15"
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
          ref={inputRef}
          type="search"
          value={query}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="search-listbox"
          aria-activedescendant={active >= 0 ? `search-opt-${active}` : undefined}
          aria-label="Search areas and landmarks"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search area, landmark, society…"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold placeholder:font-medium placeholder:text-slate-500 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-400"
        />
        {searching && (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 dark:border-slate-600 dark:border-t-emerald-400"
          />
        )}
        {query ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="shrink-0 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        ) : (
          !leading && (
            <kbd
              aria-hidden="true"
              className="hidden shrink-0 rounded-md border border-slate-300 px-1.5 py-0.5 text-[11px] font-bold leading-none text-slate-400 md:block dark:border-slate-600 dark:text-slate-500"
            >
              /
            </kbd>
          )
        )}
        {trailing}
      </form>

      {showDropdown && (
        <div
          id="search-listbox"
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-[min(26rem,60dvh)] w-full overflow-y-auto overscroll-contain rounded-2xl bg-white p-1.5 shadow-xl shadow-slate-900/20 ring-1 ring-slate-900/15 dark:bg-slate-800 dark:ring-white/15"
        >
          {row(
            { kind: "locate" },
            <>
              <IconChip tone="emerald">{CrosshairIcon}</IconChip>
              <span className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">
                Use my current location
              </span>
            </>
          )}

          {!hasQuery && recents.length > 0 && (
            <>
              <SectionLabel>Recent</SectionLabel>
              {recents.map((recent) =>
                row(
                  { kind: "recent", recent },
                  <>
                    <IconChip tone="slate">{ClockIcon}</IconChip>
                    <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                      {recent.label}
                    </span>
                  </>
                )
              )}
            </>
          )}

          {!hasQuery && popularAreas.length > 0 && (
            <>
              <SectionLabel>Popular areas</SectionLabel>
              {popularAreas.map(({ area, count }) =>
                row(
                  { kind: "area", area, count },
                  <>
                    <IconChip tone="emerald">{PinIcon}</IconChip>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
                        {area.name}
                      </span>
                      <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {area.region}
                      </span>
                    </span>
                    {count > 0 && (
                      <span className="shrink-0 rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {count.toLocaleString("en-IN")} {count === 1 ? "pin" : "pins"}
                      </span>
                    )}
                  </>
                )
              )}
            </>
          )}

          {hasQuery && areaMatches.length > 0 && (
            <>
              <SectionLabel>Areas</SectionLabel>
              {areaMatches.map(({ area, count }) =>
                row(
                  { kind: "area", area, count },
                  <>
                    <IconChip tone="emerald">{PinIcon}</IconChip>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
                        {area.name}
                      </span>
                      <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {area.region}
                      </span>
                    </span>
                    {count > 0 && (
                      <span className="shrink-0 rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {count.toLocaleString("en-IN")} {count === 1 ? "pin" : "pins"}
                      </span>
                    )}
                  </>
                )
              )}
            </>
          )}

          {hasQuery && (results?.length || searching || failed || (results && areaMatches.length === 0)) ? (
            <>
              <SectionLabel>Places</SectionLabel>
              {results?.map((place) =>
                row(
                  { kind: "place", place },
                  <>
                    <IconChip tone="slate">{PlaceIcon}</IconChip>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
                        {place.display_name.split(",")[0]}
                      </span>
                      <span className="block truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {place.display_name.split(",").slice(1).join(",").trim()}
                      </span>
                    </span>
                  </>
                )
              )}
              {searching && !results?.length && (
                <p className="px-2.5 py-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  Searching…
                </p>
              )}
              {failed && (
                <p className="px-2.5 py-2 text-[13px] font-medium text-red-500">
                  Search is unavailable right now - try again in a moment.
                </p>
              )}
              {!searching && !failed && results?.length === 0 && areaMatches.length === 0 && (
                <p className="px-2.5 py-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  Nothing found inside Pune / Pimpri-Chinchwad.
                </p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
