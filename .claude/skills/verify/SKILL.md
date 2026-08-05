---
name: verify
description: Build, launch, and drive PuneRents (Next.js map app) to verify changes end-to-end in a real browser.
---

# Verifying PuneRents

Next.js 15 app; the whole product is one Google Maps map at `/` (migrated from
MapLibre in Jul 2026 - old `.maplibregl-*` selectors no longer exist; markers
are Advanced Marker DOM with `.br-pin` / `.br-tolet` / `.br-match-dot` classes).

## Launch

```bash
npm run dev   # port 3000, ready in ~2s; demo mode (seed pins) without Supabase env
```

`.env.local` has live Supabase keys - **submitting pins in dev writes to the
real DB**. Empty-var overrides (`NEXT_PUBLIC_SUPABASE_URL= npm run dev`) are
NOT reliable: they clear the server runtime but Turbopack can still inline
`.env.local`'s `NEXT_PUBLIC_*` values into the client bundle, leaving a
half-live client that 501s on writes. The reliable way to force demo mode:

```bash
mv .env.local .env.local.bak && rm -rf .next && npm run dev
# ... verify (the map tile won't load - no Maps key - but all UI/modals drive fine;
#     check the "demo data" badge in the header/⋮ menu to confirm demo mode) ...
mv .env.local.bak .env.local && rm -rf .next   # restore IMMEDIATELY after
```

The final `rm -rf .next` matters - it drops demo-inlined client chunks so the
user's next dev run recompiles live.

## Drive

No Playwright/puppeteer in the repo. Install `playwright-core` in the session
scratchpad and drive the installed system Chrome:

```js
const { chromium } = require("playwright-core");
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
```

Gotchas learned the hard way:

- A first-visit welcome modal covers the map — dismiss it before driving
  (button text may change; currently "Skip, explore myself" — avoid the
  tour button).
- On mobile viewports many controls exist twice (hidden desktop header +
  visible bottom bar / ⋮ menu) — always use `:visible` locators, e.g.
  `page.locator("button:visible", { hasText: "＋ Add to map" })`.
- Map taps have a 250ms delay (double-tap-zoom guard) and can bounce off
  water/public-place spots with a toast — retry at pixel offsets until the
  expected modal appears.
- Wait ~3-5s after load / basemap toggles for map tiles to render before
  screenshotting.
- Rotate/tilt the map with ctrl+drag (`keyboard.down("Control")` + mouse drag).
  Compass reset state is checkable via the `.maplibregl-ctrl-compass .maplibregl-ctrl-icon`
  inline `style.transform` (all zeros when north-up and flat).
- Map control buttons are plain DOM buttons (e.g. "🛰 Satellite", "🚆 Trains & Metro")
  in the header; locate them by text.
- Satellite tile traffic goes to `server.arcgisonline.com` — count requests via
  `page.on("request")` to confirm the raster layer actually activated.
- The dark "N" circle bottom-left in screenshots is the Next.js dev-tools
  indicator, not part of the app.
- Kill the server after: `lsof -ti:3000 | xargs kill`.

## Flows worth driving

- Default load: zoom/center, pins render, stats panel counts.
- Click a pin dot → PinCard opens (bottom sheet on mobile viewport, right panel on desktop).
- Deep links: `/?pin=<id>` and `/?tolet=<id>` should fly to and open the item.
- Basemap toggle, transit toggle, city switch, BHK filter chips.
