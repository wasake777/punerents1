import { describe, expect, it } from "vitest";
import { isPublicPlacePoint } from "@/lib/publicPlaces";

// Coordinates chosen to sit squarely inside (or clearly outside) mapped
// public-place polygons - cell centers verified against the generated mask.
describe("isPublicPlacePoint", () => {
  it("treats major gardens as public places", () => {
    expect(isPublicPlacePoint(18.5026, 73.8547)).toBe(true); // Saras Baug
    expect(isPublicPlacePoint(18.4482, 73.8605)).toBe(true); // Rajiv Gandhi Zoological Park, Katraj
  });

  it("treats airport grounds as a public place", () => {
    expect(isPublicPlacePoint(18.5821, 73.9197)).toBe(true); // Lohegaon (PNQ)
  });

  it("keeps residential areas pickable", () => {
    expect(isPublicPlacePoint(18.5679, 73.9143)).toBe(false); // Viman Nagar
    expect(isPublicPlacePoint(18.599, 73.762)).toBe(false); // Wakad
    expect(isPublicPlacePoint(18.5074, 73.8077)).toBe(false); // Kothrud
    expect(isPublicPlacePoint(18.5195, 73.8553)).toBe(false); // Shaniwar Wada lanes
  });

  // Society-embedded pitches, playgrounds and gardens are deliberately not
  // blocked - their polygons are small enough that a blocked ~110m cell would
  // also swallow the flats around them. See SELECTORS in
  // scripts/generate-public-mask.mjs.
  it("keeps small society pitches, playgrounds and gardens pickable", () => {
    expect(isPublicPlacePoint(18.5673, 73.8242)).toBe(false); // Baner society grounds
    expect(isPublicPlacePoint(18.539, 73.8077)).toBe(false); // Kothrud society garden
    expect(isPublicPlacePoint(18.5117, 73.8324)).toBe(false); // Erandwane
    expect(isPublicPlacePoint(18.458, 73.8334)).toBe(false); // Ambegaon
  });

  it("treats non-residential institutional land as public", () => {
    expect(isPublicPlacePoint(18.5637, 73.8906)).toBe(true); // Yerwada Central Jail
    expect(isPublicPlacePoint(18.4791, 73.8388)).toBe(true); // Taljai forest
    expect(isPublicPlacePoint(18.5393, 73.8306)).toBe(true); // Chaturshringi substation
    expect(isPublicPlacePoint(18.4276, 73.8468)).toBe(true); // Katraj quarry
    expect(isPublicPlacePoint(18.5053, 73.91)).toBe(true); // Army Institute of Physical Training
  });

  // way/229849148 is tagged amenity=prison in OSM but is actually a school
  // (wikidata Q6694572). School compounds stay pinnable - flats sit inside and
  // beside them - so the generator excludes that element by id.
  it("ignores the OSM element mistagging a school as a prison", () => {
    expect(isPublicPlacePoint(18.5381, 73.8206)).toBe(false); // Loyola High School, Pashan
  });

  it("returns false (pickable) outside the mask's coverage", () => {
    expect(isPublicPlacePoint(28.6139, 77.209)).toBe(false); // Delhi
    expect(isPublicPlacePoint(0, 0)).toBe(false);
  });
});
