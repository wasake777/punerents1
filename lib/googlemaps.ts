// Shared Google Maps JS API loader. setOptions() may only run once before the
// first importLibrary() call, so MapView and SearchBar must load through this
// module instead of touching @googlemaps/js-api-loader directly.
//
// Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (Maps JavaScript API + Geocoding
// API enabled). NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is optional - Advanced Markers
// need a Map ID; the DEMO_MAP_ID fallback works but can't be style-customized.

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export const GOOGLE_MAPS_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export const GOOGLE_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

/** True when the Google Maps key is configured (inlined at build time). */
export const mapsConfigured = GOOGLE_MAPS_KEY !== "";

// Pune Metropolitan Region: Talegaon → Chakan → Wagholi → Saswad, covering
// Pune city (PMC), Pimpri-Chinchwad (PCMC) and the Hinjewadi IT belt.
// Used as the map's pan/zoom restriction and to filter geocoder results.
export const PMR_BOUNDS = {
  north: 18.8,
  south: 18.33,
  west: 73.55,
  east: 74.1,
};

export function inPMR(lat: number, lng: number): boolean {
  return (
    lat >= PMR_BOUNDS.south &&
    lat <= PMR_BOUNDS.north &&
    lng >= PMR_BOUNDS.west &&
    lng <= PMR_BOUNDS.east
  );
}

let configured = false;

/** importLibrary with the API key applied exactly once. */
export function loadGoogleLibrary<T extends Parameters<typeof importLibrary>[0]>(
  name: T
): ReturnType<typeof importLibrary<T>> {
  if (!configured) {
    setOptions({ key: GOOGLE_MAPS_KEY, v: "weekly", region: "IN" });
    configured = true;
  }
  return importLibrary(name);
}
