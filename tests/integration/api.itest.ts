import { beforeAll, describe, expect, it } from "vitest";

// Integration tests: exercise the real HTTP surface of a running server
// (`npm run test:integration` builds, starts, and tears it down). They only
// hit validation paths that return before any row is inserted, so the
// Supabase project is never polluted with test data.
//
// Each run uses a fresh fake client IP (the route trusts x-forwarded-for)
// so repeated runs never trip the per-IP rate limits.

// Not named BASE_URL: Vite injects its own BASE_URL="/" into process.env.
const BASE = process.env.API_BASE_URL ?? "http://localhost:3000";
const FAKE_IP = `10.99.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

function submit(body: unknown): Promise<Response> {
  return fetch(`${BASE}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": FAKE_IP,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeAll(async () => {
  // Fail fast with a clear message if the server isn't up.
  await fetch(BASE).catch(() => {
    throw new Error(`No server at ${BASE} - run \`npm run test:integration\``);
  });
});

describe("pages", () => {
  it.each(["/", "/about", "/blog", "/rent"])("GET %s renders", async (path) => {
    const res = await fetch(`${BASE}${path}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("PuneRents");
  });

  it("serves robots.txt and sitemap.xml", async () => {
    const robots = await fetch(`${BASE}/robots.txt`);
    expect(robots.status).toBe(200);
    const sitemap = await fetch(`${BASE}/sitemap.xml`);
    expect(sitemap.status).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");
  });

  it("404s on unknown paths", async () => {
    const res = await fetch(`${BASE}/no-such-page`);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/match", () => {
  it("rejects requests without the cron secret", async () => {
    const res = await fetch(`${BASE}/api/match`);
    expect(res.status).toBe(401);
  });

  it("rejects a wrong bearer token", async () => {
    const res = await fetch(`${BASE}/api/match`, {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/submit", () => {
  it("rejects invalid JSON", async () => {
    const res = await submit("{not json");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid JSON.");
  });

  it("rejects an unknown kind", async () => {
    const res = await submit({ kind: "nope", payload: {} });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Unknown request.");
  });

  it("rejects a missing kind", async () => {
    const res = await submit({ payload: {} });
    expect(res.status).toBe(400);
  });

  it("rejects non-numeric coordinates", async () => {
    const res = await submit({
      kind: "pin",
      payload: { lat: "x", lng: 73.85, rent: 20000, bhk: "1BHK" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid location.");
  });

  it("rejects a pin dropped in the Khadakwasla reservoir", async () => {
    const res = await submit({
      kind: "pin",
      // Deep inside the reservoir AND stable under the server's ~100m
      // rounding - 18.4348,73.7565 is water raw but rounds onto a land cell.
      payload: { lat: 18.43, lng: 73.745, rent: 20000, bhk: "1BHK" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/open water/);
  });

  it("rejects a listing with an invalid email", async () => {
    const res = await submit({
      kind: "listing",
      payload: {
        lat: 18.5309, lng: 73.8475, rent: 30000, bhk: "2BHK",
        contact_email: "not-an-email",
      },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid email.");
  });

  it("rejects a listing with a non-Indian phone number", async () => {
    const res = await submit({
      kind: "listing",
      payload: {
        lat: 18.5309, lng: 73.8475, rent: 30000, bhk: "2BHK",
        contact_email: "test@example.com", contact_phone: "12345",
      },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/phone/i);
  });

  it("enforces the per-IP rate limit", async () => {
    // The seeker kind allows 3 writes/hour. Burn the budget with requests
    // that fail validation AFTER the limiter (invalid email), then confirm
    // the 4th gets a 429. Uses its own IP so other tests stay unaffected.
    const ip = `10.98.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
    const burn = () =>
      fetch(`${BASE}/api/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({
          kind: "seeker",
          payload: { lat: 18.5309, lng: 73.8475, budget_max: 20000, contact_email: "bad" },
        }),
      });
    for (let i = 0; i < 3; i++) {
      expect((await burn()).status).toBe(400); // limiter passed, email failed
    }
    const res = await burn();
    expect(res.status).toBe(429);
  }, 30_000);
});
