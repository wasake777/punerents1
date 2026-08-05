import { describe, expect, it } from "vitest";
import { toMapTypeId } from "@/lib/basemap";
import { inPMR, PMR_BOUNDS } from "@/lib/googlemaps";

describe("toMapTypeId", () => {
  it("maps streets to Google's roadmap", () => {
    expect(toMapTypeId("streets")).toBe("roadmap");
  });

  it("maps satellite to hybrid so place names stay on top of imagery", () => {
    expect(toMapTypeId("satellite")).toBe("hybrid");
  });
});

describe("PMR bounds", () => {
  it("covers the Pune Metropolitan Region box", () => {
    expect(PMR_BOUNDS.south).toBeLessThan(PMR_BOUNDS.north);
    expect(PMR_BOUNDS.west).toBeLessThan(PMR_BOUNDS.east);
  });

  it("accepts central Pune and Pimpri-Chinchwad", () => {
    expect(inPMR(18.5204, 73.8567)).toBe(true); // Pune
    expect(inPMR(18.6298, 73.7997)).toBe(true); // Pimpri-Chinchwad
  });

  it("rejects points outside the region", () => {
    expect(inPMR(19.076, 72.8777)).toBe(false); // Mumbai
    expect(inPMR(28.61, 77.2)).toBe(false); // Delhi
    expect(inPMR(18.7546, 73.4062)).toBe(false); // Lonavala, west of the box
  });
});
