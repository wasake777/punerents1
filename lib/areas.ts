// Canonical locality registry powering the /rent/[area] SEO pages and the
// sitemap. Slugs are permanent once published - Google indexes them - so
// rename an area's `name`, never its `slug`.

export type Region = "Pune" | "Pimpri-Chinchwad" | "Around Pune";

export interface Area {
  slug: string;
  name: string;
  region: Region;
  lat: number;
  lng: number;
  /** Pins within this distance of the anchor count as "in" the area. */
  radiusKm: number;
  /** One-liner used in meta descriptions and page intros. Facts only. */
  blurb: string;
}

export const AREAS: Area[] = [
  // ---- Pune: central ----
  { slug: "shivajinagar", name: "Shivajinagar", region: "Pune", lat: 18.5309, lng: 73.8475, radiusKm: 2, blurb: "The city's transport and education heart - FC Road, COEP and both metro lines meet here, with some of central Pune's priciest rentals." },
  { slug: "deccan-gymkhana", name: "Deccan Gymkhana", region: "Pune", lat: 18.5178, lng: 73.8412, radiusKm: 2, blurb: "Old-Pune prestige address around FC College and the Aqua Line - leafy lanes, cafés and premium older buildings." },
  { slug: "camp", name: "Camp", region: "Pune", lat: 18.512, lng: 73.879, radiusKm: 2, blurb: "The cantonment quarter around MG Road and East Street - central, walkable, and minutes from Pune station." },
  { slug: "koregaon-park", name: "Koregaon Park", region: "Pune", lat: 18.5362, lng: 73.893, radiusKm: 2, blurb: "Pune's most storied upscale neighbourhood - bungalow plots, the Osho commune lane and the city's highest asking rents." },
  { slug: "kalyani-nagar", name: "Kalyani Nagar", region: "Pune", lat: 18.549, lng: 73.903, radiusKm: 2, blurb: "Planned east-Pune enclave of IT offices, malls and gated towers, one metro stop from the airport road." },
  { slug: "yerwada", name: "Yerwada", region: "Pune", lat: 18.546, lng: 73.887, radiusKm: 2.5, blurb: "East-Pune office belt anchored by EON IT Park and the World Trade Center - heavy working-professional rental demand." },
  { slug: "swargate", name: "Swargate", region: "Pune", lat: 18.5018, lng: 73.8636, radiusKm: 2, blurb: "South-central transit hub where the Purple Line terminates - older buildings, unbeatable bus connectivity." },
  // ---- Pune: west ----
  { slug: "kothrud", name: "Kothrud", region: "Pune", lat: 18.5074, lng: 73.8077, radiusKm: 2.5, blurb: "West Pune's big established residential hub - metro-connected, college-adjacent and a first-choice for families and students." },
  { slug: "karve-nagar", name: "Karve Nagar", region: "Pune", lat: 18.4887, lng: 73.816, radiusKm: 2, blurb: "Sensible mid-market locality between Kothrud and Warje, close to MIT and the Karve Road metro stretch." },
  { slug: "warje", name: "Warje", region: "Pune", lat: 18.479, lng: 73.796, radiusKm: 2.5, blurb: "Value pocket west of Karve Nagar with newer societies spilling toward the NDA hills." },
  { slug: "bavdhan", name: "Bavdhan", region: "Pune", lat: 18.513, lng: 73.777, radiusKm: 2.5, blurb: "Hillside suburb on the Chandani Chowk corridor - newer towers priced between Kothrud and the Hinjewadi belt." },
  { slug: "baner", name: "Baner", region: "Pune", lat: 18.559, lng: 73.7868, radiusKm: 2.5, blurb: "The IT-corridor favourite - high-rise societies, café strips and quick access to Hinjewadi and Aundh." },
  { slug: "balewadi", name: "Balewadi", region: "Pune", lat: 18.578, lng: 73.771, radiusKm: 2, blurb: "Stadium-side sibling of Baner on the future Line 3 route - slightly cheaper than Baner for the same commute." },
  { slug: "aundh", name: "Aundh", region: "Pune", lat: 18.56, lng: 73.807, radiusKm: 2, blurb: "Premium west-Pune address with wide roads, university proximity and strong family rental demand." },
  { slug: "pashan", name: "Pashan", region: "Pune", lat: 18.535, lng: 73.791, radiusKm: 2, blurb: "Greener, quieter neighbour of Aundh around Pashan Lake - popular with university staff and researchers." },
  { slug: "sinhagad-road", name: "Sinhagad Road", region: "Pune", lat: 18.46, lng: 73.815, radiusKm: 3, blurb: "Long southwest corridor toward the fort - dense mid-market societies and some of west Pune's lowest rents." },
  // ---- Pune: east ----
  { slug: "viman-nagar", name: "Viman Nagar", region: "Pune", lat: 18.5679, lng: 73.9143, radiusKm: 2, blurb: "Airport-side rental heavyweight next to Phoenix Marketcity and Symbiosis - huge 1 BHK demand from young professionals." },
  { slug: "wadgaon-sheri", name: "Wadgaon Sheri", region: "Pune", lat: 18.55, lng: 73.925, radiusKm: 2, blurb: "Value locality squeezed between Kalyani Nagar and Kharadi - same EON commute, noticeably lower rents." },
  { slug: "kharadi", name: "Kharadi", region: "Pune", lat: 18.5515, lng: 73.9345, radiusKm: 2.5, blurb: "East Pune's IT boomtown around EON and the World Trade Center - endless new towers and the city's fastest-rising rents." },
  { slug: "keshav-nagar", name: "Keshav Nagar", region: "Pune", lat: 18.533, lng: 73.944, radiusKm: 2, blurb: "Riverside pocket between Kharadi and Mundhwa - big new-township supply at a discount to Kharadi proper." },
  { slug: "hadapsar", name: "Hadapsar", region: "Pune", lat: 18.5089, lng: 73.926, radiusKm: 2.5, blurb: "Industrial-turned-residential southeast hub by Magarpatta and the Fursungi IT park - deep mid-market rental stock." },
  { slug: "magarpatta", name: "Magarpatta", region: "Pune", lat: 18.515, lng: 73.927, radiusKm: 1.5, blurb: "The walk-to-work township - cyber-city offices inside, gated residential rows around them, and rents that hold a premium." },
  { slug: "wanowrie", name: "Wanowrie", region: "Pune", lat: 18.483, lng: 73.901, radiusKm: 2.5, blurb: "Leafy southeast cantonment-edge locality popular with defence families and long-stay tenants." },
  { slug: "undri", name: "Undri", region: "Pune", lat: 18.458, lng: 73.912, radiusKm: 2.5, blurb: "Southern growth corridor of new mid-rise societies - among the cheapest family rentals inside city limits." },
  { slug: "wagholi", name: "Wagholi", region: "Pune", lat: 18.582, lng: 74.003, radiusKm: 3, blurb: "Eastern gateway on the Nagar Road - high-supply budget belt feeding Kharadi and EON commuters." },
  { slug: "dhanori", name: "Dhanori", region: "Pune", lat: 18.585, lng: 73.908, radiusKm: 2, blurb: "Northeast suburb between Lohegaon and Viman Nagar - newer buildings at a step below airport-corridor rents." },
  // ---- Pune: south ----
  { slug: "katraj", name: "Katraj", region: "Pune", lat: 18.4529, lng: 73.866, radiusKm: 2.5, blurb: "Southern entry point on the Satara road - lakeside zoo, big societies and some of the city's lowest rents." },
  { slug: "bibwewadi", name: "Bibwewadi", region: "Pune", lat: 18.483, lng: 73.866, radiusKm: 2, blurb: "Established south-Pune middle-class belt between Swargate and Katraj - steady family rental demand." },
  { slug: "dhankawadi", name: "Dhankawadi", region: "Pune", lat: 18.469, lng: 73.851, radiusKm: 2, blurb: "Southwest residential pocket around Bharati Vidyapeeth - student-friendly rents and older housing stock." },
  { slug: "kondhwa", name: "Kondhwa", region: "Pune", lat: 18.462, lng: 73.889, radiusKm: 2.5, blurb: "Dense southeast locality on the NIBM road - big supply, mixed stock, and rents below the Wanowrie side." },
  { slug: "khadki", name: "Khadki", region: "Pune", lat: 18.555, lng: 73.841, radiusKm: 2, blurb: "Cantonment-edge locality on the Purple Line - minutes from Aundh and Shivajinagar at gentler rents." },
  // ---- Pune: Hinjewadi IT belt ----
  { slug: "hinjewadi", name: "Hinjewadi", region: "Pune", lat: 18.5913, lng: 73.7389, radiusKm: 3, blurb: "The Rajiv Gandhi Infotech Park - Pune's biggest office cluster and its single largest rental market for tech professionals." },
  // ---- Pimpri-Chinchwad ----
  { slug: "wakad", name: "Wakad", region: "Pimpri-Chinchwad", lat: 18.599, lng: 73.762, radiusKm: 2.5, blurb: "PCMC's Hinjewadi-facing boomtown - wall-to-wall new societies and the most-searched rental market in the twin city." },
  { slug: "pimple-saudagar", name: "Pimple Saudagar", region: "Pimpri-Chinchwad", lat: 18.59, lng: 73.789, radiusKm: 2, blurb: "Planned PCMC suburb between Wakad and Aundh - parks, wide roads and strong young-family demand." },
  { slug: "pimple-gurav", name: "Pimple Gurav", region: "Pimpri-Chinchwad", lat: 18.586, lng: 73.817, radiusKm: 2, blurb: "Older, denser neighbour of Pimple Saudagar on the Aundh side - a step cheaper for the same commute." },
  { slug: "pimple-nilakh", name: "Pimple Nilakh", region: "Pimpri-Chinchwad", lat: 18.573, lng: 73.793, radiusKm: 1.5, blurb: "Compact riverside pocket tucked between Baner and Aundh - quieter, with limited new supply." },
  { slug: "pimpri", name: "Pimpri", region: "Pimpri-Chinchwad", lat: 18.622, lng: 73.805, radiusKm: 2, blurb: "The old industrial heart around PCMC Bhavan - metro-served, central to the twin city, mid-market rents." },
  { slug: "chinchwad", name: "Chinchwad", region: "Pimpri-Chinchwad", lat: 18.629, lng: 73.781, radiusKm: 2.5, blurb: "Established PCMC hub on the old Mumbai highway - big MIDC workforce demand and steady family rentals." },
  { slug: "akurdi", name: "Akurdi", region: "Pimpri-Chinchwad", lat: 18.648, lng: 73.764, radiusKm: 2, blurb: "Railway-and-metro suburb beside the Chikhali industrial belt - practical, affordable working-professional rentals." },
  { slug: "nigdi", name: "Nigdi", region: "Pimpri-Chinchwad", lat: 18.659, lng: 73.769, radiusKm: 2, blurb: "PCMC's planned northwest node - wide sectors, the Bhakti-Shakti chowk, and some of the twin city's best value." },
  { slug: "ravet", name: "Ravet", region: "Pimpri-Chinchwad", lat: 18.646, lng: 73.742, radiusKm: 2.5, blurb: "Expressway-side growth node where PCMC meets the Hinjewadi belt - high new-tower supply, budget rents." },
  { slug: "tathawade", name: "Tathawade", region: "Pimpri-Chinchwad", lat: 18.619, lng: 73.747, radiusKm: 2, blurb: "Education-hub suburb packed with colleges and hostels - strong student and first-job rental demand." },
  { slug: "bhosari", name: "Bhosari", region: "Pimpri-Chinchwad", lat: 18.629, lng: 73.847, radiusKm: 2.5, blurb: "The big MIDC industrial node on the metro line - workforce housing at some of the region's lowest rents." },
  { slug: "dighi", name: "Dighi", region: "Pimpri-Chinchwad", lat: 18.616, lng: 73.88, radiusKm: 2.5, blurb: "Northeast PCMC pocket near the airport road and magazine point - emerging mid-range societies." },
  { slug: "moshi", name: "Moshi", region: "Pimpri-Chinchwad", lat: 18.664, lng: 73.858, radiusKm: 2.5, blurb: "Fast-growing northern node by the Chakan corridor - new supply priced well below the PCMC core." },
  // ---- Around Pune ----
  { slug: "talegaon-dabhade", name: "Talegaon Dabhade", region: "Around Pune", lat: 18.735, lng: 73.6756, radiusKm: 3, blurb: "MIDC and education town on the old Mumbai highway - a self-contained market with genuinely low rents." },
  { slug: "chakan", name: "Chakan", region: "Around Pune", lat: 18.76, lng: 73.8635, radiusKm: 3, blurb: "The auto-hub boomtown north of PCMC - factory-worker demand and some of the cheapest new flats near the city." },
  { slug: "alandi", name: "Alandi", region: "Around Pune", lat: 18.677, lng: 73.898, radiusKm: 2.5, blurb: "Temple town on the Indrayani, minutes from the airport road - budget rentals feeding the northeast corridor." },
  { slug: "loni-kalbhor", name: "Loni Kalbhor", region: "Around Pune", lat: 18.49, lng: 74.02, radiusKm: 3, blurb: "Eastern railway-side town past Hadapsar - low rents for tenants who don't mind the commute." },
  { slug: "pirangut", name: "Pirangut", region: "Around Pune", lat: 18.51, lng: 73.685, radiusKm: 3, blurb: "Hillside MIDC pocket beyond Chandani Chowk - a budget alternative to the Kothrud-Bavdhan belt." },
];

export function findArea(slug: string): Area | undefined {
  return AREAS.find((a) => a.slug === slug);
}

const EARTH_KM_PER_DEG_LAT = 111.32;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (a.lat - b.lat) * EARTH_KM_PER_DEG_LAT;
  const dLng =
    (a.lng - b.lng) * EARTH_KM_PER_DEG_LAT * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export function nearbyAreas(area: Area, count = 6): Area[] {
  return AREAS.filter((a) => a.slug !== area.slug)
    .sort((x, y) => distanceKm(x, area) - distanceKm(y, area))
    .slice(0, count);
}

/** Bounding box used to query pins for an area. */
export function areaBounds(area: Area) {
  const dLat = area.radiusKm / EARTH_KM_PER_DEG_LAT;
  const dLng = area.radiusKm / (EARTH_KM_PER_DEG_LAT * Math.cos(area.lat * (Math.PI / 180)));
  return {
    north: area.lat + dLat,
    south: area.lat - dLat,
    east: area.lng + dLng,
    west: area.lng - dLng,
  };
}

export const REGIONS: Region[] = ["Pune", "Pimpri-Chinchwad", "Around Pune"];
