"use client";

import { useEffect, useRef } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Basemap, toMapTypeId } from "@/lib/basemap";
import {
  GOOGLE_MAP_ID,
  inPMR,
  loadGoogleLibrary,
  mapsConfigured,
  PMR_BOUNDS,
} from "@/lib/googlemaps";
import { formatINR } from "@/lib/format";
import { Bounds } from "@/lib/stats";
import { BHK_COLORS, inrShort, MatchPreviewItem, RentPin, ToLetSpot } from "@/lib/types";
import type { City, PickPurpose } from "./App";

const CITY_VIEWS: Record<City, { center: google.maps.LatLngLiteral; zoom: number }> = {
  pune: { center: { lat: 18.5204, lng: 73.8567 }, zoom: 11 },
  pcmc: { center: { lat: 18.6298, lng: 73.7997 }, zoom: 12 },
};

interface Props {
  pins: RentPin[];
  city: City;
  picking: PickPurpose | null;
  showTransit: boolean;
  basemap: Basemap;
  /** Dark theme - the map is recreated in place with the DARK color scheme. */
  dark: boolean;
  matchPreview: MatchPreviewItem[] | null;
  toLets: ToLetSpot[];
  focus: { lat: number; lng: number; at: number; zoom?: number } | null;
  locate: number | null;
  /** Pin whose detail card is open - drawn bigger, map panned to keep it visible. */
  selectedPinId: string | null;
  /** Freshly added pin - pulses for a few seconds so the author can spot it. */
  newPinId: string | null;
  /** Pins created from this browser - marked "You" so the author can always
      tell them apart (hover cues don't exist on touch screens). */
  myPinIds: string[];
  /** True while any detail card (pin or to-let) is open. */
  cardOpen: boolean;
  /** Tapped empty-map spot while the "Add something here" menu is open -
      marked with a pulsing dot and panned above the centered menu card. */
  addHere: { lat: number; lng: number } | null;
  onLocateError: (message: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  /** Tap on empty map (no card open, not picking) → open the add-here menu. */
  onAddHere: (lat: number, lng: number) => void;
  onSelectPin: (pinId: string) => void;
  onSelectToLet: (spotId: string) => void;
  /** "I'm interested in this flat" on an available-flat dot. */
  onInterest: (item: MatchPreviewItem, lat: number, lng: number) => void;
  /** First tap on empty map while a card is open closes the card. */
  onDismissCard: () => void;
  onBoundsChange: (b: Bounds) => void;
}

// --- Marker DOM builders ------------------------------------------------------
// Advanced Markers render arbitrary DOM. Each pin is a single price tag in
// the flat-size colour with a pointed tail on the coordinate; selection grows
// the tag and expands its text (see globals.css .br-pin/.br-tag rules).

function pinContent(p: RentPin, selected: boolean, mine: boolean): HTMLElement {
  const reports =
    p.report_count > 0
      ? `⚠ ${p.report_count} ${p.report_count === 1 ? "report" : "reports"}`
      : "";
  const stars =
    p.rating_count > 0
      ? `<span class="br-tag-star">★${(p.rating_sum / p.rating_count).toFixed(1)}</span>`
      : "";
  const price = `₹${inrShort(p.rent)}`;
  const el = document.createElement("div");
  el.className = "br-pin" + (selected ? " br-pin-selected" : "");
  el.style.setProperty("--pin", BHK_COLORS[p.bhk] ?? "#64748b");
  el.innerHTML = `
    <div class="br-tag">${mine ? '<span class="br-tag-you">You</span>' : ""}${
      selected ? `${p.bhk} · ${price}` : price
    }${stars}</div>
    <div class="br-tag-tail"></div>
    ${reports ? `<div class="br-pin-reports">${reports}</div>` : ""}`;
  return el;
}

function clusterContent(count: number): HTMLElement {
  const size = count >= 30 ? 52 : count >= 10 ? 42 : 34;
  const el = document.createElement("div");
  el.className = "br-cluster";
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.textContent = count >= 1000 ? `${Math.round(count / 100) / 10}k` : String(count);
  return el;
}

function toLetContent(): HTMLElement {
  const el = document.createElement("div");
  el.className = "br-tolet";
  el.innerHTML = `
    <div class="br-tolet-dot"></div>
    <div class="br-tolet-label">To-Let</div>`;
  return el;
}

function matchContent(item: MatchPreviewItem): HTMLElement {
  const el = document.createElement("div");
  el.className = "br-pin br-match";
  el.style.setProperty("--pin", "#ea580c");
  el.innerHTML = `
    <div class="br-tag">₹${inrShort(item.rent)}</div>
    <div class="br-tag-tail"></div>`;
  return el;
}

function locationDotContent(): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText =
    "width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 6px rgb(59 130 246 / .8)";
  return el;
}

function matchPopupContent(
  item: MatchPreviewItem,
  onInterest: () => void
): HTMLElement {
  const el = document.createElement("div");
  el.style.cssText = "padding:12px 14px;font-family:inherit;min-width:200px";
  el.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#ea580c;margin-bottom:4px">${item.whole_flat ? "FLAT" : "ROOM"} AVAILABLE</div>
    <div class="br-iw-price" style="font-size:18px;font-weight:800">${formatINR(item.rent)}<span class="br-iw-sub" style="font-size:12px;font-weight:500">/month</span></div>
    <div class="br-iw-sub" style="font-size:12px;margin-top:2px">${item.bhk} · ${item.furnishing}</div>`;
  const btn = document.createElement("button");
  btn.textContent = "🙋 I'm interested in this flat";
  btn.style.cssText =
    "margin-top:10px;width:100%;background:#c2410c;color:#fff;border:none;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit";
  btn.addEventListener("click", onInterest);
  el.appendChild(btn);
  const hint = document.createElement("div");
  hint.textContent =
    "Share your preferences - the owner's contact lands in your inbox.";
  hint.style.cssText = "font-size:11px;color:#94a3b8;margin-top:6px";
  el.appendChild(hint);
  return el;
}

export default function MapView({
  pins,
  city,
  picking,
  showTransit,
  basemap,
  dark,
  matchPreview,
  toLets,
  focus,
  locate,
  selectedPinId,
  newPinId,
  myPinIds,
  cardOpen,
  addHere,
  onLocateError,
  onMapClick,
  onAddHere,
  onSelectPin,
  onSelectToLet,
  onInterest,
  onDismissCard,
  onBoundsChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerLibRef = useRef<google.maps.MarkerLibrary | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const pinMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const toLetMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const matchMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const transitLayersRef = useRef<{ lines: google.maps.Data; stations: google.maps.Data } | null>(null);
  const locationRef = useRef<{
    dot: google.maps.marker.AdvancedMarkerElement;
    circle: google.maps.Circle;
  } | null>(null);
  const loadedRef = useRef(false);
  const pickingRef = useRef(picking);
  const basemapRef = useRef(basemap);
  const selectedPinIdRef = useRef(selectedPinId);
  const cardOpenRef = useRef(cardOpen);
  const onLocateErrorRef = useRef(onLocateError);
  const onMapClickRef = useRef(onMapClick);
  const onAddHereRef = useRef(onAddHere);
  const onSelectPinRef = useRef(onSelectPin);
  const onSelectToLetRef = useRef(onSelectToLet);
  const onInterestRef = useRef(onInterest);
  const onDismissCardRef = useRef(onDismissCard);
  const onBoundsChangeRef = useRef(onBoundsChange);
  // The map's event handlers outlive any single render, so they read the
  // latest props through refs. Synced in an effect (not during render), as
  // concurrent React may replay renders it never commits.
  useEffect(() => {
    pickingRef.current = picking;
    basemapRef.current = basemap;
    selectedPinIdRef.current = selectedPinId;
    cardOpenRef.current = cardOpen;
    onLocateErrorRef.current = onLocateError;
    onMapClickRef.current = onMapClick;
    onAddHereRef.current = onAddHere;
    onSelectPinRef.current = onSelectPin;
    onSelectToLetRef.current = onSelectToLet;
    onInterestRef.current = onInterest;
    onDismissCardRef.current = onDismissCard;
    onBoundsChangeRef.current = onBoundsChange;
  });

  // Where the map was looking before a theme rebuild (colorScheme can only be
  // set at construction, so toggling dark mode recreates the map in place).
  const lastViewRef = useRef<{
    center: google.maps.LatLngLiteral;
    zoom: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !mapsConfigured) return;
    let cancelled = false;

    (async () => {
      const [{ Map: GMap, InfoWindow, Circle }, markerLib] = await Promise.all([
        loadGoogleLibrary("maps"),
        loadGoogleLibrary("marker"),
      ]);
      if (cancelled || !containerRef.current || mapRef.current) return;
      markerLibRef.current = markerLib;

      const view = lastViewRef.current ?? CITY_VIEWS.pune;
      const map = new GMap(containerRef.current, {
        mapId: GOOGLE_MAP_ID,
        center: view.center,
        zoom: view.zoom,
        colorScheme: dark
          ? google.maps.ColorScheme.DARK
          : google.maps.ColorScheme.LIGHT,
        mapTypeId: toMapTypeId(basemapRef.current),
        restriction: { latLngBounds: PMR_BOUNDS, strictBounds: false },
        // The app has its own basemap/satellite toggles and card UI; Google's
        // default POI popups and controls would fight them.
        disableDefaultUI: true,
        // Phones pinch-zoom and the bottom action bar owns that edge; only
        // desktop gets the +/- buttons.
        zoomControl: window.matchMedia("(min-width: 768px)").matches,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
        clickableIcons: false,
        gestureHandling: "greedy",
      });
      mapRef.current = map;
      infoWindowRef.current = new InfoWindow();

      // --- Geolocate ("my current location") - blue dot + accuracy circle ---
      locationRef.current = {
        dot: new markerLib.AdvancedMarkerElement({ content: locationDotContent() }),
        circle: new Circle({
          strokeColor: "#3b82f6",
          strokeOpacity: 0.4,
          strokeWeight: 1,
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
        }),
      };

      map.addListener("idle", () => {
        const b = map.getBounds();
        if (!b) return;
        const j = b.toJSON();
        onBoundsChangeRef.current({
          north: j.north,
          south: j.south,
          east: j.east,
          west: j.west,
        });
      });

      // Maps fires "click" before "dblclick", so a double-click/double-tap
      // zoom would also trigger the tap action (the add-here menu springing
      // open mid-zoom). Act after a short delay and cancel on dblclick.
      let clickTimer: ReturnType<typeof setTimeout> | null = null;
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const { lat, lng } = e.latLng.toJSON();
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
          clickTimer = null;
          if (pickingRef.current) {
            onMapClickRef.current(lat, lng);
            return;
          }
          // With a detail card open the instinct is "tap outside to close" -
          // honor that instead of springing the add-menu on the user.
          if (cardOpenRef.current) {
            onDismissCardRef.current();
            return;
          }
          // Clicked empty map → "Add something here" menu (React overlay,
          // rendered by App, which also handles water taps with a toast; the
          // tapped spot gets a marker via the addHere effect below).
          infoWindowRef.current?.close();
          onAddHereRef.current(lat, lng);
        }, 250);
      });
      map.addListener("dblclick", () => {
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
      });

      // Zoom-gate the To-Let text labels like the old minzoom:12 symbol layer.
      map.addListener("zoom_changed", () => {
        const show = (map.getZoom() ?? 0) >= 12;
        containerRef.current?.classList.toggle("br-show-tolet-labels", show);
      });

      // Clusterer manages which pin markers are on the map; markers are
      // (re)supplied by the pins effect below.
      clustererRef.current = new MarkerClusterer({
        map,
        markers: [],
        renderer: {
          render: ({ count, position }) =>
            new markerLib.AdvancedMarkerElement({
              position,
              content: clusterContent(count),
              zIndex: 100 + count,
            }),
        },
        // Default handler is a bare fitBounds: edge pins end up clipped under
        // the search bar, and near-coincident pins send it to street level.
        // Pad for the overlay UI and tag markers, and cap the dive at 18 -
        // clustering stops above 16, so the cluster always splits.
        // The PMR restriction is narrower than the viewport at city zoom,
        // which freezes horizontal panning and makes fitBounds land at the
        // old longitude - lift it for the animation and restore on idle
        // (cluster bounds are always inside PMR).
        onClusterClick: (_, cluster, m) => {
          if (!cluster.bounds) return;
          infoWindowRef.current?.close();
          m.setOptions({ restriction: null, maxZoom: 18 });
          m.fitBounds(cluster.bounds, {
            top: 110,
            bottom: 90,
            left: 70,
            right: 70,
          });
          google.maps.event.addListenerOnce(m, "idle", () =>
            m.setOptions({
              maxZoom: null,
              restriction: { latLngBounds: PMR_BOUNDS, strictBounds: false },
            })
          );
        },
      });

      loadedRef.current = true;
      // Flush data that arrived before the API finished loading.
      syncPins(pinsRef.current, selectedPinIdRef.current);
      syncToLets(toLetsRef.current);
      syncMatches(matchPreviewRef.current ?? []);
      syncTransit(showTransitRef.current);
      map.setOptions({
        draggableCursor: pickingRef.current ? "crosshair" : undefined,
      });
    })();

    return () => {
      cancelled = true;
      // Google Maps has no destroy API: drop references and listeners; the
      // container div is removed by React (or reused by a theme rebuild).
      if (mapRef.current) {
        const c = mapRef.current.getCenter();
        const z = mapRef.current.getZoom();
        if (c && z !== undefined) {
          lastViewRef.current = { center: c.toJSON(), zoom: z };
        }
        google.maps.event.clearInstanceListeners(mapRef.current);
      }
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
      pinMarkersRef.current.clear();
      toLetMarkersRef.current = [];
      matchMarkersRef.current = [];
      transitLayersRef.current = null;
      locationRef.current = null;
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  // --- Pins (clustered) --------------------------------------------------------
  function syncPins(list: RentPin[], selectedId: string | null) {
    const markerLib = markerLibRef.current;
    const clusterer = clustererRef.current;
    if (!markerLib || !clusterer) return;
    clusterer.clearMarkers();
    pinMarkersRef.current.clear();
    const markers = list.map((p) => {
      const mine = myPinIdsRef.current.has(p.id);
      const marker = new markerLib.AdvancedMarkerElement({
        position: { lat: p.lat, lng: p.lng },
        content: pinContent(p, p.id === selectedId, mine),
        gmpClickable: true,
        // Own pins float above neighbours so their "You" label stays readable.
        zIndex: p.id === selectedId ? 500 : mine ? 300 : undefined,
      });
      marker.addListener("click", () => {
        if (pickingRef.current) return;
        infoWindowRef.current?.close(); // e.g. a lingering add-menu
        onSelectPinRef.current(p.id);
      });
      pinMarkersRef.current.set(p.id, marker);
      return marker;
    });
    clusterer.addMarkers(markers);
  }

  // --- To-Let boards -------------------------------------------------------------
  function syncToLets(spots: ToLetSpot[]) {
    const markerLib = markerLibRef.current;
    const map = mapRef.current;
    if (!markerLib || !map) return;
    toLetMarkersRef.current.forEach((m) => (m.map = null));
    toLetMarkersRef.current = spots.map((s) => {
      const marker = new markerLib.AdvancedMarkerElement({
        map,
        position: { lat: s.lat, lng: s.lng },
        content: toLetContent(),
        gmpClickable: true,
      });
      marker.addListener("click", () => {
        if (pickingRef.current) return;
        infoWindowRef.current?.close();
        onSelectToLetRef.current(s.id);
      });
      return marker;
    });
  }

  // --- Available flats / instant matches (orange, above everything) -------------
  function syncMatches(items: MatchPreviewItem[]) {
    const markerLib = markerLibRef.current;
    const map = mapRef.current;
    if (!markerLib || !map) return;
    matchMarkersRef.current.forEach((m) => (m.map = null));
    matchMarkersRef.current = items.map((item) => {
      const marker = new markerLib.AdvancedMarkerElement({
        map,
        position: { lat: item.lat, lng: item.lng },
        content: matchContent(item),
        gmpClickable: true,
        zIndex: 400,
      });
      marker.addListener("click", () => {
        if (pickingRef.current) return;
        const iw = infoWindowRef.current!;
        iw.setOptions({ headerDisabled: false });
        iw.setContent(
          matchPopupContent(item, () => {
            iw.close();
            onInterestRef.current(item, item.lat, item.lng);
          })
        );
        iw.open({ map, anchor: marker });
      });
      return marker;
    });
  }

  // --- Transit overlay (Pune Metro) -------------------------------------------
  // Two google.maps.Data layers, created on first toggle only so the GeoJSON
  // isn't fetched by users who never open it.
  function syncTransit(show: boolean) {
    const map = mapRef.current;
    if (!map) return;
    if (show && !transitLayersRef.current) {
      const lines = new google.maps.Data();
      lines.loadGeoJson("/data/transit-lines.geojson");
      lines.setStyle((f) => ({
        strokeColor: (f.getProperty("color") as string) ?? "#334155",
        // Data layers can't dash lines, so the upcoming Line 3 is drawn
        // thinner to set it apart from the operational corridors.
        strokeWeight: f.getProperty("status") === "upcoming" ? 2 : 3.5,
        strokeOpacity: 0.8,
        clickable: false,
      }));
      const stations = new google.maps.Data();
      stations.loadGeoJson("/data/stations.geojson");
      const styleStations = () => {
        const zoom = map.getZoom() ?? 0;
        stations.setStyle((f) => ({
          clickable: false,
          visible: zoom >= 10.5,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 3.5,
            fillColor: "#ffffff",
            fillOpacity: 1,
            strokeColor: "#334155",
            strokeWeight: 1.5,
          },
          // Station names appear at the same zoom the old symbol layer used.
          label:
            zoom >= 12
              ? {
                  text: (f.getProperty("name") as string) ?? "",
                  fontSize: "10px",
                  color: "#334155",
                  className: "br-station-label",
                }
              : undefined,
        }));
      };
      styleStations();
      map.addListener("zoom_changed", styleStations);
      transitLayersRef.current = { lines, stations };
    }
    const layers = transitLayersRef.current;
    if (!layers) return;
    layers.lines.setMap(show ? map : null);
    layers.stations.setMap(show ? map : null);
  }

  // --- Geolocate ----------------------------------------------------------------
  function locateNow() {
    const map = mapRef.current;
    if (!map || !locationRef.current) return;
    if (!("geolocation" in navigator)) {
      onLocateErrorRef.current("Couldn't get your location - try again.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!inPMR(lat, lng)) {
          onLocateErrorRef.current(
            "You're outside Pune / Pimpri-Chinchwad right now - the map stays within the region."
          );
          return;
        }
        const loc = locationRef.current!;
        loc.dot.position = { lat, lng };
        loc.dot.map = map;
        loc.circle.setCenter({ lat, lng });
        loc.circle.setRadius(accuracy);
        loc.circle.setMap(map);
        map.panTo({ lat, lng });
        map.setZoom(15);
      },
      (e) => {
        onLocateErrorRef.current(
          e.code === e.PERMISSION_DENIED
            ? "Location permission denied - allow it in your browser to use this."
            : "Couldn't get your location - try again."
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    map.setMapTypeId(toMapTypeId(basemap));
  }, [basemap]);

  // Keep latest values available to the async init, and push updates once loaded.
  const pinsRef = useRef(pins);
  useEffect(() => {
    pinsRef.current = pins;
    if (!loadedRef.current) return;
    syncPins(pins, selectedPinIdRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins]);

  // Own-pin ids as a Set for the marker builders; a change (a pin was just
  // added and remembered) restyles the markers.
  const myPinIdsRef = useRef<Set<string>>(new Set(myPinIds));
  useEffect(() => {
    myPinIdsRef.current = new Set(myPinIds);
    if (!loadedRef.current) return;
    syncPins(pinsRef.current, selectedPinIdRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPinIds]);

  // Pulse the freshly added pin. Depends on `pins` too because syncPins
  // rebuilds the marker DOM, dropping any class set on the old element.
  useEffect(() => {
    if (!newPinId || !loadedRef.current) return;
    const el = pinMarkersRef.current.get(newPinId)?.content;
    if (!(el instanceof HTMLElement)) return;
    el.classList.add("br-pin-new");
    return () => el.classList.remove("br-pin-new");
  }, [newPinId, pins]);

  // Selection: restyle just the affected markers (no full rebuild), and pan
  // the map so the selected pin stays visible beside the card - a right panel
  // on desktop (sm+), a bottom sheet on mobile. The pan is undone on close.
  const prevSelectedRef = useRef<string | null>(null);
  const panOffsetRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const restyle = (id: string | null, selected: boolean) => {
      if (!id) return;
      const marker = pinMarkersRef.current.get(id);
      const pin = pinsRef.current.find((p) => p.id === id);
      if (!marker || !pin) return;
      const mine = myPinIdsRef.current.has(id);
      marker.content = pinContent(pin, selected, mine);
      marker.zIndex = selected ? 500 : mine ? 300 : undefined;
    };
    if (prevSelectedRef.current !== selectedPinId) {
      restyle(prevSelectedRef.current, false);
      restyle(selectedPinId, true);
      prevSelectedRef.current = selectedPinId;
    }
    if (selectedPinId) {
      const p = pinsRef.current.find((x) => x.id === selectedPinId);
      if (!p) return;
      const mobile = window.innerWidth < 640;
      const offset = mobile
        ? { x: 0, y: Math.round(window.innerHeight * 0.19) }
        : { x: 180, y: 0 };
      map.panTo({ lat: p.lat, lng: p.lng });
      // Shift the center into the half not covered by the card.
      map.panBy(offset.x, offset.y);
      panOffsetRef.current = offset;
    } else if (panOffsetRef.current) {
      map.panBy(-panOffsetRef.current.x, -panOffsetRef.current.y);
      panOffsetRef.current = null;
    }
  }, [selectedPinId]);

  // "Add something here": pulse a dot on the tapped spot and lift it above
  // the centered menu card; both are undone when the menu closes.
  const addHereMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const addHerePanRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    const markerLib = markerLibRef.current;
    if (!map || !markerLib || !loadedRef.current || !addHere) return;
    const el = document.createElement("div");
    el.className = "br-addhere";
    addHereMarkerRef.current = new markerLib.AdvancedMarkerElement({
      map,
      position: addHere,
      content: el,
      zIndex: 600,
    });
    // panBy with positive y moves the camera down, so the spot rises above
    // the map center - clear of the menu card.
    const offset = { x: 0, y: Math.round(window.innerHeight * 0.28) };
    map.panTo(addHere);
    map.panBy(offset.x, offset.y);
    addHerePanRef.current = offset;
    return () => {
      if (addHereMarkerRef.current) {
        addHereMarkerRef.current.map = null;
        addHereMarkerRef.current = null;
      }
      if (addHerePanRef.current) {
        map.panBy(-addHerePanRef.current.x, -addHerePanRef.current.y);
        addHerePanRef.current = null;
      }
    };
  }, [addHere]);

  const toLetsRef = useRef(toLets);
  useEffect(() => {
    toLetsRef.current = toLets;
    if (loadedRef.current) syncToLets(toLets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toLets]);

  const showTransitRef = useRef(showTransit);
  useEffect(() => {
    showTransitRef.current = showTransit;
    if (loadedRef.current) syncTransit(showTransit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTransit]);

  const matchPreviewRef = useRef(matchPreview);
  useEffect(() => {
    matchPreviewRef.current = matchPreview;
    if (loadedRef.current) syncMatches(matchPreview ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchPreview]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const view = CITY_VIEWS[city];
    map.panTo(view.center);
    map.setZoom(view.zoom);
  }, [city]);

  // Search result / new pin → fly there. `at` makes repeat searches re-fly;
  // `zoom` lets a new pin land below cluster level (default suits search).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.panTo({ lat: focus.lat, lng: focus.lng });
    map.setZoom(focus.zoom ?? 15);
  }, [focus]);

  // "My current location" → blue dot + accuracy circle + fly-to.
  useEffect(() => {
    if (locate) locateNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locate]);

  useEffect(() => {
    mapRef.current?.setOptions({
      draggableCursor: picking ? "crosshair" : undefined,
    });
  }, [picking]);

  if (!mapsConfigured) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 p-6 text-center">
        <div className="max-w-sm rounded-2xl bg-white p-6 shadow-lg">
          <p className="text-sm font-semibold text-slate-800">
            Google Maps is not configured
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Set <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
            in <code className="rounded bg-slate-100 px-1">.env.local</code> (Maps
            JavaScript API + Geocoding API enabled) and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
