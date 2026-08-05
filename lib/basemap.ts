// Basemap views on Google Maps. "streets" is the standard roadmap;
// "satellite" is Google's hybrid view - imagery with place names on top,
// same look the old Esri-under-labels setup approximated.

export type Basemap = "streets" | "satellite";

export type GoogleMapTypeId = "roadmap" | "hybrid";

export function toMapTypeId(basemap: Basemap): GoogleMapTypeId {
  return basemap === "satellite" ? "hybrid" : "roadmap";
}
