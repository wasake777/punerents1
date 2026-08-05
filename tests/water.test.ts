import { describe, expect, it } from "vitest";
import { isWaterPoint } from "@/lib/water";

// Coordinates chosen to be unambiguous - well inland or well inside a water
// body - and verified against the generated mask.
describe("isWaterPoint", () => {
  it("treats central land locations as land", () => {
    expect(isWaterPoint(18.5309, 73.8475)).toBe(false); // Shivajinagar
    expect(isWaterPoint(18.5074, 73.8077)).toBe(false); // Kothrud
    expect(isWaterPoint(18.5913, 73.7389)).toBe(false); // Hinjewadi
  });

  it("treats the Khadakwasla reservoir as water", () => {
    expect(isWaterPoint(18.4348, 73.7565)).toBe(true);
    expect(isWaterPoint(18.43, 73.745)).toBe(true);
  });

  it("treats the Pavana river near Ravet as water", () => {
    expect(isWaterPoint(18.641, 73.745)).toBe(true);
  });

  it("returns false (pickable) outside the mask's coverage", () => {
    expect(isWaterPoint(28.6139, 77.209)).toBe(false); // Delhi
    expect(isWaterPoint(0, 0)).toBe(false);
  });

  it("keeps riverside neighbourhoods pickable (conservative mask)", () => {
    expect(isWaterPoint(18.5362, 73.893)).toBe(false); // Koregaon Park
    expect(isWaterPoint(18.599, 73.762)).toBe(false); // Wakad
  });
});
