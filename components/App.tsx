"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addAreaAlert,
  addListing,
  addPin,
  addSeeker,
  addToLet,
  availableFlats,
  fetchPins,
  fetchToLets,
  isLive,
  matchPreview as fetchMatchPreview,
  reportPin,
  reportToLet,
} from "@/lib/data";
import Logo, { LogoMark } from "./Logo";
import ThemeToggle, { Theme } from "./ThemeToggle";
import Tour from "./Tour";
import { Basemap } from "@/lib/basemap";
import { roundCoord } from "@/lib/geo";
import { share } from "@/lib/share";
import { Bounds, pinsInBounds } from "@/lib/stats";
import { inPMR } from "@/lib/googlemaps";
import { isWaterPoint } from "@/lib/water";
import { isPublicPlacePoint } from "@/lib/publicPlaces";
import {
  Bhk,
  BHK_COLORS,
  BHK_OPTIONS,
  MatchPreviewItem,
  NewListing,
  NewRentPin,
  NewSeeker,
  NewToLetSpot,
  PinFlag,
  RentPin,
  ToLetSpot,
} from "@/lib/types";
import SearchBar from "./SearchBar";
import StatsPanel, { StatsCard } from "./StatsPanel";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-slate-500">
      Loading map…
    </div>
  ),
});

// Modals and detail cards only appear after a user interaction, so they're
// code-split out of the initial bundle and fetched on first open.
const AddPinModal = dynamic(() => import("./AddPinModal"));
const FindFlatModal = dynamic(() => import("./FindFlatModal"));
const ListFlatModal = dynamic(() => import("./ListFlatModal"));
const ToLetModal = dynamic(() => import("./ToLetModal"));
const SuperheroesModal = dynamic(() => import("./SuperheroesModal"));
const PinCard = dynamic(() => import("./PinCard"));
const ToLetCard = dynamic(() => import("./ToLetCard"));
const WelcomeModal = dynamic(() => import("./WelcomeModal"));
const AddHereMenu = dynamic(() => import("./AddHereMenu"));
const LiveStatsModal = dynamic(() => import("./LiveStatsModal"));
const FlagModal = dynamic(() => import("./FlagModal"));

export type City = "pune" | "pcmc";
export type PickPurpose = "rent" | "list" | "seek" | "tolet";

// The "＋ Add to map" menu: one entry per contribution flow, each with a
// one-line explanation so first-timers can tell the flows apart.
const ADD_OPTIONS: {
  purpose: PickPurpose;
  emoji: string;
  title: string;
  sub: string;
}[] = [
  {
    purpose: "rent",
    emoji: "📍",
    title: "My rent",
    sub: "Share what you pay - 100% anonymous",
  },
  {
    purpose: "list",
    emoji: "🏠",
    title: "List my flat",
    sub: "Seekers get your contact by email - never shown on the map",
  },
  {
    purpose: "tolet",
    emoji: "🪧",
    title: "A To-Let board I spotted",
    sub: "Save someone a broker fee",
  },
];

const PICK_BANNERS: Record<PickPurpose, string> = {
  rent: "Tap the map at your building's location",
  list: "Tap the map where your flat is",
  seek: "Tap the map where you want to live",
  tolet: "Tap the map where you saw the To-Let board",
};

// IDs of pins this browser created. The app is anonymous, so localStorage is
// the only "identity" - it lets the user's own pins stay marked ("You") and
// findable via the 📍 My pin button across visits on the same device.
const MY_PINS_KEY = "punerents_my_pins";

function loadMyPinIds(): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(MY_PINS_KEY) ?? "[]");
    return Array.isArray(stored)
      ? stored.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

// --- Shared control styling ---------------------------------------------------
// One "glass pill" token for every floating map control so the chrome reads
// as a single system; primary CTAs get coloured shadows to lift off the map.
const GLASS_BTN =
  "rounded-full bg-white/95 px-3.5 py-2 text-[13px] font-bold text-slate-900 shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/15 backdrop-blur-md transition hover:bg-white dark:bg-slate-800/95 dark:text-slate-100 dark:ring-white/15 dark:hover:bg-slate-800";
const GLASS_BTN_ON =
  "rounded-full bg-slate-900 px-3.5 py-2 text-[13px] font-bold text-white shadow-lg shadow-slate-900/25 backdrop-blur-md transition dark:bg-slate-100 dark:text-slate-900";
const CTA_EMERALD =
  "rounded-full bg-emerald-600 text-[15px] font-bold text-white shadow-lg shadow-emerald-600/40 transition hover:bg-emerald-500 active:scale-[0.98]";
const CTA_ORANGE =
  "rounded-full bg-orange-600 text-[15px] font-bold text-white shadow-lg shadow-orange-600/40 transition hover:bg-orange-500 active:scale-[0.98]";

const TRANSIT_LEGEND: [string, string][] = [
  ["#9333ea", "Purple Line"],
  ["#06b6d4", "Aqua Line"],
  ["#f97316", "Line 3 (upcoming)"],
];

export default function App() {
  const [pins, setPins] = useState<RentPin[]>([]);
  const [toLets, setToLets] = useState<ToLetSpot[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bhkFilter, setBhkFilter] = useState<Bhk | null>(null);
  const [city, setCity] = useState<City>("pune");
  const [picking, setPicking] = useState<PickPurpose | null>(null);
  const [picked, setPicked] = useState<{
    purpose: PickPurpose;
    lat: number;
    lng: number;
  } | null>(null);
  const [showTransit, setShowTransit] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("streets");
  const [matches, setMatches] = useState<MatchPreviewItem[] | null>(null);
  const [availableMode, setAvailableMode] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Empty-map tap → "Add something here" menu, anchored to this spot.
  const [addHere, setAddHere] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [selectedToLetId, setSelectedToLetId] = useState<string | null>(null);
  // Item awaiting a flag reason - drives FlagModal.
  const [flagging, setFlagging] = useState<{
    kind: "pin" | "tolet";
    id: string;
  } | null>(null);
  // Listing the user tapped "I'm interested" on → pre-filled seeker form.
  const [interest, setInterest] = useState<MatchPreviewItem | null>(null);
  const [showSuperheroes, setShowSuperheroes] = useState(false);
  const [showLiveStats, setShowLiveStats] = useState(false);
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    at: number;
    zoom?: number;
  } | null>(null);
  // Freshly added pin - highlighted on the map for a few seconds.
  const [newPinId, setNewPinId] = useState<string | null>(null);
  // Pins created from this browser - marked "You" on the map permanently.
  const [myPinIds, setMyPinIds] = useState<string[]>([]);
  const [locate, setLocate] = useState<number | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Mobile-only UI: stats card inside the ⋮ menu, collapsed BHK legend.
  const [mobileStats, setMobileStats] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  // Spotlight onboarding tour - offered after the welcome modal, replayable
  // from "🎓 Take the tour" in the secondary controls.
  const [tourOpen, setTourOpen] = useState(false);
  const endTour = useCallback(() => {
    window.localStorage.setItem("punerents_toured", "1");
    setTourOpen(false);
  }, []);
  // Mirrors the .dark class on <html> (set pre-paint in layout.tsx); the map
  // needs it as state to rebuild with the matching color scheme.
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) setTheme("dark");
  }, []);

  // First visit → one-time explainer of what the dots are.
  useEffect(() => {
    if (!window.localStorage.getItem("punerents_welcomed")) setShowWelcome(true);
    setMyPinIds(loadMyPinIds());
  }, []);

  useEffect(() => {
    // Shared links deep-link straight to a spot: /?pin=<id> or /?tolet=<id>.
    // /rent/[area] pages link back with /?at=<lat>,<lng> to open the map
    // centered on that area (a pin/tolet focus, arriving later, wins).
    const params = new URLSearchParams(window.location.search);
    const at = params.get("at");
    if (at) {
      const [lat, lng] = at.split(",").map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng) && inPMR(lat, lng)) {
        setFocus({ lat, lng, at: Date.now(), zoom: 14 });
      }
    }
    const sharedPin = params.get("pin");
    const sharedToLet = sharedPin ? null : params.get("tolet");
    fetchPins()
      .then((loaded) => {
        setPins(loaded);
        const p = sharedPin && loaded.find((x) => x.id === sharedPin);
        if (p) {
          setSelectedPinId(p.id);
          setFocus({ lat: p.lat, lng: p.lng, at: Date.now() });
        }
      })
      .catch((e) => setLoadError(e.message));
    fetchToLets()
      .then((loaded) => {
        setToLets(loaded);
        const t = sharedToLet && loaded.find((x) => x.id === sharedToLet);
        if (t) {
          setSelectedToLetId(t.id);
          setFocus({ lat: t.lat, lng: t.lng, at: Date.now() });
        }
      })
      .catch(() => {}); // To-Let layer is best-effort
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // The "just added" pulse fades out after a few seconds.
  useEffect(() => {
    if (!newPinId) return;
    const t = setTimeout(() => setNewPinId(null), 6000);
    return () => clearTimeout(t);
  }, [newPinId]);

  const visiblePins = useMemo(
    () => (bhkFilter ? pins.filter((p) => p.bhk === bhkFilter) : pins),
    [pins, bhkFilter]
  );

  const statsPins = useMemo(
    () => (bounds ? pinsInBounds(visiblePins, bounds) : visiblePins),
    [visiblePins, bounds]
  );

  const selectedPin = useMemo(
    () => pins.find((p) => p.id === selectedPinId) ?? null,
    [pins, selectedPinId]
  );
  // Own pins that are still on the map (a pin can disappear after 3 reports).
  const myPins = useMemo(() => {
    const ids = new Set(myPinIds);
    return pins.filter((p) => ids.has(p.id));
  }, [pins, myPinIds]);
  // Repeated "📍 My pin" taps cycle through the user's pins, newest first.
  const myPinCycleRef = useRef(0);
  const handleMyPin = () => {
    if (myPins.length === 0) return;
    const pin =
      myPins[myPins.length - 1 - (myPinCycleRef.current % myPins.length)];
    myPinCycleRef.current += 1;
    setMoreOpen(false);
    // An active BHK filter that doesn't match would hide their pin.
    if (bhkFilter && pin.bhk !== bhkFilter) setBhkFilter(null);
    // Zoom 17 keeps it below cluster level; the pulse makes it easy to spot.
    setFocus({ lat: pin.lat, lng: pin.lng, at: Date.now(), zoom: 17 });
    setNewPinId(pin.id);
  };
  const selectedToLet = useMemo(
    () => toLets.find((t) => t.id === selectedToLetId) ?? null,
    [toLets, selectedToLetId]
  );

  // Shared guard for every pin-placement path; toasts and returns false when
  // the (rounded, as-stored) point can't hold a pin.
  const checkPinnable = useCallback((lat: number, lng: number): boolean => {
    if (isWaterPoint(roundCoord(lat), roundCoord(lng))) {
      setToast("🌊 That spot is in open water - tap a location on land.");
      return false;
    }
    if (isPublicPlacePoint(roundCoord(lat), roundCoord(lng))) {
      setToast("🌳 That's a public place (park, beach, station) - tap a residential building instead.");
      return false;
    }
    return true;
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!picking) return;
      if (!checkPinnable(lat, lng)) return;
      setPicked({ purpose: picking, lat, lng });
    },
    [picking, checkPinnable]
  );

  const handlePickHere = useCallback(
    (purpose: PickPurpose, lat: number, lng: number) => {
      if (!checkPinnable(lat, lng)) return;
      setPicked({ purpose, lat, lng });
    },
    [checkPinnable]
  );

  const closeModal = () => {
    setPicked(null);
    setPicking(null);
  };

  const handleAddPin = async (input: NewRentPin, alertEmail: string | null) => {
    const pin = await addPin(input);
    setPins((prev) => [...prev, pin]);
    // Remember it as theirs: marked "You" on the map, reachable via 📍 My pin.
    setMyPinIds((prev) => {
      const next = [...prev, pin.id];
      window.localStorage.setItem(MY_PINS_KEY, JSON.stringify(next));
      return next;
    });
    // An active BHK filter that doesn't match would hide the pin they just added.
    if (bhkFilter && pin.bhk !== bhkFilter) setBhkFilter(null);
    // Fly close enough that the clusterer shows the pin individually, and
    // pulse it so the author can spot their contribution.
    setFocus({ lat: pin.lat, lng: pin.lng, at: Date.now(), zoom: 17 });
    setNewPinId(pin.id);
    if (alertEmail) {
      // Their optional email doubles as a 1-km "flat opened here" alert.
      addAreaAlert(pin.lat, pin.lng, alertEmail).catch(() => {});
    }
    closeModal();
    setToast(
      isLive
        ? "Thanks! Your pin is on the map, marked \"You\" - find it anytime via 📍 My pin."
        : "Pin saved locally (demo mode - connect Supabase to go live)."
    );
  };

  const handleAddListing = async (input: NewListing) => {
    await addListing(input);
    closeModal();
    setToast(
      "Your flat is listed! Matching seekers will get your contact by email. It's never shown on the map."
    );
  };

  const handleAddSeeker = async (input: NewSeeker) => {
    await addSeeker(input);
    let found: MatchPreviewItem[] = [];
    try {
      found = await fetchMatchPreview(input);
    } catch {
      // preview is best-effort; registration already succeeded
    }
    closeModal();
    setMatches(found);
    setAvailableMode(false);
    setToast(
      found.length > 0
        ? `${found.length} matching ${found.length === 1 ? "flat" : "flats"} right now - shown in orange. You'll be emailed as new ones appear.`
        : "No matches yet - you'll get an email as soon as a matching flat is listed."
    );
  };

  const handleAddToLet = async (spot: NewToLetSpot, photo: Blob | null) => {
    const created = await addToLet(spot, photo);
    setToLets((prev) => [created, ...prev]);
    setFocus({ lat: created.lat, lng: created.lng, at: Date.now(), zoom: 17 });
    closeModal();
    setToast("🪧 On the map! You just saved someone a broker fee. Superhero ✨");
  };

  // Remembers what this browser has already flagged. Purely a courtesy so the
  // same person isn't asked twice - the rule that actually counts is the
  // one-row-per-reporter constraint in the database (schema v9), because
  // localStorage is trivially cleared and never reaches the server.
  const alreadyReported = (id: string) =>
    !!window.localStorage.getItem(`punerents_reported_${id}`);
  const markReported = (id: string) =>
    window.localStorage.setItem(`punerents_reported_${id}`, "1");

  // Flagging now asks why first; FlagModal collects the reason and calls back.
  const handleReport = (pinId: string) => {
    setSelectedPinId(null);
    if (pinId.startsWith("seed-")) {
      setToast("Demo pin - flagging works on real pins once Supabase is live.");
      return;
    }
    if (alreadyReported(pinId)) {
      setToast("You've already flagged this pin - it's with our reviewers.");
      return;
    }
    setFlagging({ kind: "pin", id: pinId });
  };

  const submitFlag = async (flag: PinFlag) => {
    if (!flagging) return;
    const { kind, id } = flagging;
    try {
      if (kind === "pin") {
        await reportPin(id, flag);
        // Show the flag on the pin straight away. Note it is NOT removed from
        // the map: flags queue a pin for review, they don't hide it.
        setPins((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, report_count: p.report_count + 1 } : p
          )
        );
      } else {
        await reportToLet(id, flag);
      }
      markReported(id);
      setFlagging(null);
      setToast("Thanks - flagged for review. A human checks every one.");
    } catch (e) {
      throw e instanceof Error ? e : new Error("Flag failed.");
    }
  };

  const handleRated = useCallback((pinId: string, stars: number) => {
    setPins((prev) =>
      prev.map((p) =>
        p.id === pinId
          ? {
              ...p,
              rating_sum: p.rating_sum + stars,
              rating_count: p.rating_count + 1,
            }
          : p
      )
    );
  }, []);

  const handleReportToLet = (spotId: string) => {
    setSelectedToLetId(null);
    if (alreadyReported(spotId)) {
      setToast("You've already flagged this spot - it's with our reviewers.");
      return;
    }
    setFlagging({ kind: "tolet", id: spotId });
  };

  const handleToggleAvailable = async () => {
    if (availableMode) {
      setMatches(null);
      setAvailableMode(false);
      return;
    }
    try {
      const flats = await availableFlats();
      setMatches(flats);
      setAvailableMode(true);
      setSelectedPinId(null);
      setToast(
        flats.length > 0
          ? `${flats.length} ${flats.length === 1 ? "flat is" : "flats are"} available right now - shown in orange.`
          : "No flats listed right now - be the first: List my flat."
      );
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not load available flats.");
    }
  };

  const handleShareApp = async () => {
    const result = await share({
      title: "PuneRents",
      text: "See what people really pay in rent across Pune & Pimpri-Chinchwad - anonymous rent pins, no brokers.",
      url: window.location.origin,
    });
    if (result === "copied") setToast("🔗 Link copied - paste it to your friends!");
    else if (result === "failed")
      setToast("Couldn't share - copy the URL from the address bar.");
  };

  // The "＋ Add to map" menu entries, shared by the desktop dropdown (opens
  // downward from the header) and the mobile one (opens upward from the
  // bottom action bar).
  const addOptionButtons = ADD_OPTIONS.map((o) => (
    <button
      key={o.purpose}
      onClick={() => {
        setAddMenuOpen(false);
        setPicking(o.purpose);
      }}
      className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
    >
      <span className="mt-0.5">{o.emoji}</span>
      <span>
        <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
          {o.title}
        </span>
        <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
          {o.sub}
        </span>
      </span>
    </button>
  ));

  // Secondary map controls, rendered as a row on md+ and inside the mobile
  // "⋮" menu below that breakpoint.
  const secondaryControls = (
    <>
      {myPins.length > 0 && (
        <button
          onClick={handleMyPin}
          className="rounded-full bg-emerald-600 px-3.5 py-2 text-[13px] font-bold text-white shadow-lg shadow-emerald-600/40 transition hover:bg-emerald-500"
        >
          📍 {myPins.length > 1 ? `My pins (${myPins.length})` : "My pin"}
        </button>
      )}
      <button
        onClick={handleToggleAvailable}
        className={
          availableMode
            ? "rounded-full bg-orange-600 px-3.5 py-2 text-[13px] font-bold text-white shadow-lg shadow-orange-600/40 transition"
            : GLASS_BTN
        }
      >
        🏠 Available flats
      </button>
      <button
        onClick={() => {
          setMoreOpen(false);
          setShowLiveStats(true);
        }}
        className={GLASS_BTN}
      >
        📊 Live stats
      </button>
      <ThemeToggle showLabel onChange={setTheme} className={GLASS_BTN} />
      <button
        onClick={() => {
          setMoreOpen(false);
          setTourOpen(true);
        }}
        className={GLASS_BTN}
      >
        🎓 Take the tour
      </button>
      <button onClick={() => setShowSuperheroes(true)} className={GLASS_BTN}>
        🪧 Spotters
      </button>
      <button onClick={handleShareApp} className={GLASS_BTN}>
        📤 Share app
      </button>
      <button
        onClick={() => setShowTransit((s) => !s)}
        className={showTransit ? GLASS_BTN_ON : GLASS_BTN}
      >
        🚇 Metro
      </button>
      <button
        onClick={() => setBasemap((b) => (b === "streets" ? "satellite" : "streets"))}
        className={basemap === "satellite" ? GLASS_BTN_ON : GLASS_BTN}
      >
        🛰 Satellite
      </button>
      <div className="flex overflow-hidden rounded-full bg-white/95 text-[13px] font-bold shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/15 backdrop-blur-md dark:bg-slate-800/95 dark:ring-white/15">
        {(
          [
            ["pune", "Pune"],
            ["pcmc", "Pimpri-Chinchwad"],
          ] as [City, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCity(key)}
            className={`px-3.5 py-2 transition ${
              city === key
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapView
        pins={visiblePins}
        city={city}
        picking={picking}
        showTransit={showTransit}
        basemap={basemap}
        dark={theme === "dark"}
        matchPreview={matches}
        toLets={toLets}
        focus={focus}
        locate={locate}
        selectedPinId={selectedPinId}
        newPinId={newPinId}
        myPinIds={myPinIds}
        cardOpen={!!(selectedPin || selectedToLet)}
        addHere={addHere}
        onLocateError={setToast}
        onMapClick={handleMapClick}
        onAddHere={(lat, lng) => {
          if (!checkPinnable(lat, lng)) return;
          setAddHere({ lat, lng });
        }}
        onSelectPin={(id) => {
          setSelectedToLetId(null);
          setSelectedPinId(id);
        }}
        onSelectToLet={(id) => {
          setSelectedPinId(null);
          setSelectedToLetId(id);
        }}
        onInterest={(item) => {
          setSelectedPinId(null);
          setSelectedToLetId(null);
          setInterest(item);
        }}
        onDismissCard={() => {
          setSelectedPinId(null);
          setSelectedToLetId(null);
        }}
        onBoundsChange={setBounds}
      />

      {/* Header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-2 sm:p-3">
        {/* md+: brand card · centered search · action buttons */}
        <div className="hidden items-start justify-between gap-2 md:flex">
          <div className="pointer-events-auto rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/15 backdrop-blur-md dark:bg-slate-800/95 dark:ring-white/15">
            <h1 className="text-xl font-extrabold leading-tight tracking-tight">
              <Logo size={26} />
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">
              What people really pay - tap any price tag ·{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {pins.length.toLocaleString("en-IN")} pins
              </span>
              {!isLive && (
                <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">
                  demo data
                </span>
              )}
            </p>
            <a
              href="/rent"
              className="mt-0.5 inline-block text-[13px] font-bold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Area rent guide →
            </a>
          </div>

          <div className="flex flex-1 justify-center pt-1">
            <div data-tour="search" className="w-full max-w-xs">
              <SearchBar
                onGo={(lat, lng) => setFocus({ lat, lng, at: Date.now() })}
                onLocate={() => setLocate(Date.now())}
              />
            </div>
          </div>

          <div className="pointer-events-auto flex flex-col items-end gap-2">
            {picking ? (
              <button
                onClick={() => setPicking(null)}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-700"
              >
                ✕ Cancel
              </button>
            ) : (
              <div className="relative flex flex-wrap justify-end gap-1.5">
                <button
                  data-tour="seek"
                  onClick={() => setPicking("seek")}
                  className={`${CTA_ORANGE} px-4 py-2.5`}
                >
                  🔍 Find a flat
                </button>
                <button
                  data-tour="add"
                  onClick={() => setAddMenuOpen((o) => !o)}
                  className={`${CTA_EMERALD} px-4 py-2.5`}
                >
                  ＋ Add to map
                </button>
                {addMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setAddMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl bg-white p-1.5 shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/10 dark:bg-slate-800 dark:ring-white/10">
                      {addOptionButtons}
                    </div>
                  </>
                )}
              </div>
            )}
            <div data-tour="controls" className="flex max-w-md flex-wrap justify-end gap-1.5">
              {secondaryControls}
            </div>
            {/* In the column flow (not absolutely pinned) so it always sits
                below the controls, however many rows they wrap into. */}
            <StatsPanel pins={statsPins} bhkFilter={bhkFilter} />
          </div>
        </div>

        {/* Mobile: one pill - brand mark + search + ⋮ menu; actions live in
            the bottom bar so the map stays almost full-screen. */}
        <div data-tour="search" className="relative md:hidden">
          <SearchBar
            onGo={(lat, lng) => setFocus({ lat, lng, at: Date.now() })}
            onLocate={() => setLocate(Date.now())}
            leading={<LogoMark size={22} />}
            trailing={
              <button
                type="button"
                data-tour="controls"
                onClick={() => setMoreOpen((o) => !o)}
                aria-label="Menu"
                aria-expanded={moreOpen}
                className="-mr-1.5 shrink-0 rounded-lg px-1.5 text-lg leading-none text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
              >
                ⋮
              </button>
            }
          />
          {moreOpen && (
            <>
              <div
                className="pointer-events-auto fixed inset-0 z-10"
                onClick={() => setMoreOpen(false)}
              />
              <div className="pointer-events-auto absolute right-0 top-full z-20 mt-1.5 flex max-h-[70dvh] w-max max-w-[calc(100vw-1rem)] flex-col items-stretch gap-1.5 overflow-y-auto overscroll-contain">
                <div className="rounded-2xl bg-white/95 px-3.5 py-2.5 text-xs shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/15 backdrop-blur-md dark:bg-slate-800/95 dark:ring-white/15">
                  <p className="text-base font-extrabold tracking-tight">
                    <Logo size={20} />
                  </p>
                  <p className="mt-0.5 font-medium text-slate-600 dark:text-slate-300">
                    What people really pay ·{" "}
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {pins.length.toLocaleString("en-IN")} pins
                    </span>
                    {!isLive && (
                      <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">
                        demo data
                      </span>
                    )}
                  </p>
                  <a
                    href="/rent"
                    className="mt-0.5 inline-block font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Area rent guide →
                  </a>
                </div>
                <button
                  onClick={() => setMobileStats((o) => !o)}
                  className={mobileStats ? GLASS_BTN_ON : GLASS_BTN}
                >
                  📊 Area stats
                </button>
                {mobileStats && (
                  <div className="w-60">
                    <StatsCard pins={statsPins} bhkFilter={bhkFilter} />
                  </div>
                )}
                {secondaryControls}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Mobile bottom action bar - thumb-reachable primary actions. Hidden
          while a detail card (bottom sheet) is open. */}
      {!selectedPin && !selectedToLet && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] md:hidden">
          {picking ? (
            <button
              onClick={() => setPicking(null)}
              className="flex-1 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg"
            >
              ✕ Cancel
            </button>
          ) : (
            <>
              <button
                data-tour="seek"
                onClick={() => setPicking("seek")}
                className={`${CTA_ORANGE} flex-1 px-4 py-3`}
              >
                🔍 Find a flat
              </button>
              <div className="relative flex-1">
                {addMenuOpen && (
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setAddMenuOpen(false)}
                  />
                )}
                <button
                  data-tour="add"
                  onClick={() => setAddMenuOpen((o) => !o)}
                  className={`${CTA_EMERALD} relative z-20 w-full px-4 py-3`}
                >
                  ＋ Add to map
                </button>
                {addMenuOpen && (
                  <div className="absolute bottom-full right-0 z-20 mb-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white p-1.5 shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/10 dark:bg-slate-800 dark:ring-white/10">
                    {addOptionButtons}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Picking banner */}
      {picking && !picked && (
        <div className="absolute inset-x-0 top-24 z-10 flex justify-center px-4">
          <div className="animate-pulse rounded-full bg-slate-900/90 px-5 py-2.5 text-sm font-bold text-white shadow-lg ring-1 ring-white/15 backdrop-blur">
            {PICK_BANNERS[picking]}
          </div>
        </div>
      )}

      {/* Transit legend */}
      {showTransit && (
        <div className="absolute left-3 top-20 z-10 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/15 backdrop-blur-md dark:bg-slate-800/95 dark:ring-white/15">
          {TRANSIT_LEGEND.map(([color, label]) => (
            <div key={label} className="flex items-center gap-2 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="h-1 w-5 rounded" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Legend + BHK filter chips. On mobile the chips collapse behind a
          single "Filter" chip and sit above the bottom action bar. */}
      <div
        data-tour="filters"
        className="absolute bottom-16 left-3 z-10 flex max-w-[70%] flex-col items-start gap-1.5 pb-[env(safe-area-inset-bottom)] md:bottom-3"
      >
        <p
          className={`${
            legendOpen ? "block" : "hidden"
          } rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow ring-1 ring-slate-900/15 backdrop-blur dark:bg-slate-800/95 dark:text-slate-200 dark:ring-white/15 md:block`}
        >
          Tag colour = flat size · tap to filter
          {matches && matches.length > 0 && " · 🟠 available flat"}
          {toLets.length > 0 && " · 🟡 To-Let board"}
        </p>
        <div className={`${legendOpen ? "flex" : "hidden"} flex-wrap gap-1.5 md:flex`}>
          {BHK_OPTIONS.map((bhk) => (
            <button
              key={bhk}
              onClick={() => setBhkFilter((f) => (f === bhk ? null : bhk))}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold shadow-lg shadow-slate-900/15 backdrop-blur-md transition ${
                bhkFilter === bhk
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-white/95 text-slate-900 ring-1 ring-slate-900/15 hover:bg-white dark:bg-slate-800/95 dark:text-slate-100 dark:ring-white/15 dark:hover:bg-slate-800"
              } ${bhkFilter && bhkFilter !== bhk ? "opacity-50" : ""}`}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: BHK_COLORS[bhk] }}
              />
              {bhk}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setLegendOpen((o) => !o)}
            aria-expanded={legendOpen}
            className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-bold text-slate-900 shadow-lg shadow-slate-900/15 ring-1 ring-slate-900/15 backdrop-blur-md transition hover:bg-white dark:bg-slate-800/95 dark:text-slate-100 dark:ring-white/15 dark:hover:bg-slate-800 md:hidden"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: bhkFilter ? BHK_COLORS[bhkFilter] : "#94a3b8",
              }}
            />
            {bhkFilter ?? "Filter"} {legendOpen ? "▾" : "▴"}
          </button>
          {matches && (
            <button
              onClick={() => {
                setMatches(null);
                setAvailableMode(false);
              }}
              className="rounded-full bg-orange-600 px-3 py-1.5 text-[13px] font-bold text-white shadow-lg shadow-orange-600/40 transition hover:bg-orange-500"
            >
              ✕ {availableMode ? `Hide ${matches.length} available` : `Clear ${matches.length} matches`}
            </button>
          )}
        </div>
      </div>

      {addHere && (
        <AddHereMenu
          onClose={() => setAddHere(null)}
          onPick={(purpose) => {
            const { lat, lng } = addHere;
            setAddHere(null);
            handlePickHere(purpose, lat, lng);
          }}
        />
      )}

      {selectedPin && (
        <PinCard
          pin={selectedPin}
          mine={myPinIds.includes(selectedPin.id)}
          onClose={() => setSelectedPinId(null)}
          onReport={handleReport}
          onRated={handleRated}
          onSeeAvailable={() => {
            setSelectedPinId(null);
            if (!availableMode) handleToggleAvailable();
          }}
        />
      )}
      {selectedToLet && (
        <ToLetCard
          spot={selectedToLet}
          onClose={() => setSelectedToLetId(null)}
          onReport={handleReportToLet}
        />
      )}
      {flagging && (
        <FlagModal
          target={flagging.kind}
          onClose={() => setFlagging(null)}
          onSubmit={submitFlag}
        />
      )}

      {picked?.purpose === "rent" && (
        <AddPinModal location={picked} onClose={closeModal} onSubmit={handleAddPin} />
      )}
      {picked?.purpose === "list" && (
        <ListFlatModal location={picked} onClose={closeModal} onSubmit={handleAddListing} />
      )}
      {picked?.purpose === "seek" && (
        <FindFlatModal
          location={picked}
          pins={pins}
          onClose={closeModal}
          onSubmit={handleAddSeeker}
        />
      )}
      {interest && (
        <FindFlatModal
          location={interest}
          pins={pins}
          interest={interest}
          onClose={() => setInterest(null)}
          onSubmit={async (input) => {
            await handleAddSeeker(input);
            setInterest(null);
            setToast(
              "Interest registered! The owner's contact lands in your inbox within a day - other matching flats are shown in orange."
            );
          }}
        />
      )}
      {picked?.purpose === "tolet" && (
        <ToLetModal location={picked} onClose={closeModal} onSubmit={handleAddToLet} />
      )}
      {showSuperheroes && (
        <SuperheroesModal spots={toLets} onClose={() => setShowSuperheroes(false)} />
      )}
      {showLiveStats && (
        <LiveStatsModal
          pins={pins}
          onClose={() => setShowLiveStats(false)}
          onViewPin={(pin) => {
            setShowLiveStats(false);
            if (bhkFilter && pin.bhk !== bhkFilter) setBhkFilter(null);
            setFocus({ lat: pin.lat, lng: pin.lng, at: Date.now(), zoom: 17 });
            setSelectedToLetId(null);
            setSelectedPinId(pin.id);
          }}
        />
      )}
      {showWelcome && (
        <WelcomeModal
          onClose={() => {
            window.localStorage.setItem("punerents_welcomed", "1");
            setShowWelcome(false);
          }}
          onTour={() => {
            window.localStorage.setItem("punerents_welcomed", "1");
            setShowWelcome(false);
            setTourOpen(true);
          }}
        />
      )}

      <Tour open={tourOpen} onClose={endTour} />

      {toast && (
        <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <div className="max-w-md rounded-2xl bg-slate-900/90 px-4 py-3 text-sm font-medium text-white shadow-xl ring-1 ring-white/15 backdrop-blur">
            {toast}
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <div className="rounded-xl bg-red-600 px-4 py-2.5 text-sm text-white shadow-xl">
            {loadError}
            {isLive && (
              <span className="block text-xs opacity-80">
                Did you run supabase/schema.sql in the Supabase SQL Editor?
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
