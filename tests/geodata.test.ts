// The bundled transit GeoJSON must stay valid and inside the locked map area,
// or the overlay silently renders nothing.
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const DATA_DIR = join(__dirname, "..", "public", "data");

// Slightly wider than PMR_BOUNDS - line geometry may legitimately poke past
// the viewport lock (e.g. Line 3 towards Hinjewadi Phase 3).
const LNG = [73.5, 74.15];
const LAT = [18.3, 18.85];

function load(name: string) {
  return JSON.parse(readFileSync(join(DATA_DIR, name), "utf8"));
}

describe("transit-lines.geojson", () => {
  const geo = load("transit-lines.geojson");

  it("is a FeatureCollection with all expected lines", () => {
    expect(geo.type).toBe("FeatureCollection");
    const names: string[] = geo.features.map(
      (f: { properties: { name: string } }) => f.properties.name
    );
    expect(names.some((n) => n.includes("Purple"))).toBe(true);
    expect(names.some((n) => n.includes("Aqua"))).toBe(true);
    expect(names.some((n) => n.includes("Line 3"))).toBe(true);
  });

  it("gives every line a color and a group", () => {
    for (const f of geo.features) {
      expect(f.properties.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof f.properties.group).toBe("string");
    }
  });

  it("keeps all coordinates in the greater Pune area", () => {
    for (const f of geo.features) {
      const lines =
        f.geometry.type === "MultiLineString"
          ? f.geometry.coordinates
          : [f.geometry.coordinates];
      for (const line of lines) {
        for (const [lng, lat] of line) {
          expect(lng).toBeGreaterThanOrEqual(LNG[0]);
          expect(lng).toBeLessThanOrEqual(LNG[1]);
          expect(lat).toBeGreaterThanOrEqual(LAT[0]);
          expect(lat).toBeLessThanOrEqual(LAT[1]);
        }
      }
    }
  });
});

describe("stations.geojson", () => {
  const geo = load("stations.geojson");

  it("has a healthy number of named stations", () => {
    expect(geo.features.length).toBeGreaterThan(25);
    for (const f of geo.features) {
      expect(f.properties.name).toBeTruthy();
      expect(["rail", "metro"]).toContain(f.properties.kind);
    }
  });

  it("contains the landmark interchanges and termini", () => {
    const names = geo.features.map((f: { properties: { name: string } }) => f.properties.name);
    for (const station of ["Shivaji Nagar", "Civil Court", "Swargate", "Vanaz", "Ramwadi", "PCMC Bhavan"]) {
      expect(names).toContain(station);
    }
  });

  it("has no duplicate station names", () => {
    const names = geo.features.map((f: { properties: { name: string } }) => f.properties.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
