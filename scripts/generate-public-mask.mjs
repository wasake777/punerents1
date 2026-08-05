// Generates lib/publicMask.ts — a packed bitmask of "public place" cells for
// the PMR: parks, gardens, playgrounds, sports grounds, riverbanks, hills,
// railway land, and airport grounds. Pins can't be dropped there.
//
// How: queries the free OSM Overpass API for the polygon categories below,
// stitches multipolygon outer rings, and rasterizes them onto the same
// ~110m-cell grid the water mask uses (z12 tiles, 3px cells). A cell is
// marked public only when its center lies inside a polygon, so buildings
// across the street from a park stay pickable. Inner rings (holes) are
// ignored — a clearing inside a park is still park for our purposes.
//
// Run: node scripts/generate-public-mask.mjs   (re-run only if bounds or
// categories change)

import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";

const ZOOM = 12;
const SCALE = 3; // tile pixels per cell edge — must match the water mask

// Must cover PMR_BOUNDS in lib/googlemaps.ts: [73.55,18.33]..[74.1,18.8]
const WEST = 73.55, SOUTH = 18.33, EAST = 74.1, NORTH = 18.8;

// Polygon categories that count as "public places". Kept deliberately
// narrow: schools, hospitals and places of worship are NOT blocked because
// flats legitimately sit inside or beside those compounds.
const SELECTORS = [
  `["leisure"~"^(park|garden|playground|pitch|stadium|golf_course|recreation_ground|nature_reserve)$"]`,
  `["landuse"~"^(recreation_ground|village_green|railway)$"]`,
  `["natural"="beach"]`,
  `["aeroway"="aerodrome"]`,
  `["boundary"="national_park"]`,
];

const n = 2 ** ZOOM;
const lngToX = (lng) => ((lng + 180) / 360) * n;
const latToY = (lat) =>
  ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n;

const x0 = Math.floor(lngToX(WEST));
const x1 = Math.floor(lngToX(EAST));
const y0 = Math.floor(latToY(NORTH)); // y grows southward in tile coords
const y1 = Math.floor(latToY(SOUTH));
const canvasW = (x1 - x0 + 1) * 256;
const canvasH = (y1 - y0 + 1) * 256;
const width = Math.floor(canvasW / SCALE);
const height = Math.floor(canvasH / SCALE);

// --- fetch from Overpass (cached — the response is ~tens of MB) -----------

const bbox = `(${SOUTH},${WEST},${NORTH},${EAST})`;
const query = `[out:json][timeout:180];(${SELECTORS.map((s) => `wr${s}${bbox};`).join("")});out geom;`;

const cacheDir = fileURLToPath(new URL("./.tile-cache/", import.meta.url));
mkdirSync(cacheDir, { recursive: true });
const cacheFile = `${cacheDir}overpass-public.json`;

async function fetchElements() {
  if (existsSync(cacheFile)) {
    console.log("using cached Overpass response");
    return JSON.parse(readFileSync(cacheFile, "utf8")).elements;
  }
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of endpoints) {
      console.log(`querying ${url} ...`);
      try {
        const res = await fetch(url, {
          method: "POST",
          body: "data=" + encodeURIComponent(query),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "PuneRents-public-mask-generator/1.0 (one-time build script)",
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const json = JSON.parse(text);
        writeFileSync(cacheFile, text);
        return json.elements;
      } catch (err) {
        console.warn(`  failed: ${err.message}`);
      }
    }
    console.log("retrying in 30s ...");
    await new Promise((r) => setTimeout(r, 30_000));
  }
  throw new Error("all Overpass endpoints failed");
}

// --- polygon assembly ------------------------------------------------------

const ptKey = (p) => `${p.lat.toFixed(7)},${p.lon.toFixed(7)}`;

/** Greedily join way segments end-to-end into closed rings. */
function stitchRings(segments) {
  const open = segments.filter((s) => s && s.length >= 2).map((s) => s.slice());
  const rings = [];
  while (open.length) {
    let ring = open.pop();
    let extended = true;
    while (extended && ptKey(ring[0]) !== ptKey(ring[ring.length - 1])) {
      extended = false;
      for (let i = 0; i < open.length; i++) {
        const s = open[i];
        const head = ptKey(ring[0]);
        const tail = ptKey(ring[ring.length - 1]);
        if (ptKey(s[0]) === tail) ring = ring.concat(s.slice(1));
        else if (ptKey(s[s.length - 1]) === tail) ring = ring.concat(s.slice(0, -1).reverse());
        else if (ptKey(s[s.length - 1]) === head) ring = s.slice(0, -1).concat(ring);
        else if (ptKey(s[0]) === head) ring = s.slice(1).reverse().concat(ring);
        else continue;
        open.splice(i, 1);
        extended = true;
        break;
      }
    }
    if (ring.length >= 4 && ptKey(ring[0]) === ptKey(ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}

function ringsFromElement(el) {
  if (el.type === "way" && el.geometry) {
    const g = el.geometry;
    return g.length >= 4 && ptKey(g[0]) === ptKey(g[g.length - 1]) ? [g] : [];
  }
  if (el.type === "relation" && el.members) {
    return stitchRings(
      el.members
        .filter((m) => m.type === "way" && (m.role === "outer" || m.role === "") && m.geometry)
        .map((m) => m.geometry)
    );
  }
  return [];
}

// --- rasterize -------------------------------------------------------------

const bits = new Uint8Array(Math.ceil((width * height) / 8));

function insideRing(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function markRing(ring) {
  const pts = ring.map((p) => [
    (lngToX(p.lon) - x0) * 256,
    (latToY(p.lat) - y0) * 256,
  ]);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const c0 = Math.max(0, Math.floor(minX / SCALE));
  const c1 = Math.min(width - 1, Math.floor(maxX / SCALE));
  const r0 = Math.max(0, Math.floor(minY / SCALE));
  const r1 = Math.min(height - 1, Math.floor(maxY / SCALE));
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (insideRing((col + 0.5) * SCALE, (row + 0.5) * SCALE, pts)) {
        const idx = row * width + col;
        bits[idx >> 3] |= 1 << (idx & 7);
      }
    }
  }
}

const elements = await fetchElements();
console.log(`${elements.length} OSM elements`);
let ringCount = 0;
for (const el of elements) {
  for (const ring of ringsFromElement(el)) {
    markRing(ring);
    ringCount++;
  }
}

let publicCells = 0;
for (let i = 0; i < width * height; i++) {
  if (bits[i >> 3] & (1 << (i & 7))) publicCells++;
}
console.log(
  `${ringCount} rings, grid ${width}×${height}, public cells: ${publicCells} (${((publicCells / (width * height)) * 100).toFixed(1)}%)`
);

const b64 = Buffer.from(bits).toString("base64");
const out = `// GENERATED by scripts/generate-public-mask.mjs — do not edit by hand.
// Public-place bitmask for the Pune Metropolitan Region, derived from OSM
// Overpass polygons (parks, playgrounds, sports grounds, hills, railway and
// airport land). One bit per ~110m cell; 1 = public place.

export const PUBLIC_MASK = {
  zoom: ${ZOOM},
  x0: ${x0}, // tile-grid origin of the mask
  y0: ${y0},
  scale: ${SCALE}, // tile pixels per cell edge
  width: ${width},
  height: ${height},
  data: "${b64}",
} as const;
`;
writeFileSync(fileURLToPath(new URL("../lib/publicMask.ts", import.meta.url)), out);
console.log(`lib/publicMask.ts written (${(out.length / 1024).toFixed(0)} KB)`);
