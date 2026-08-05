// /api/submit gateway: rate limiting, captcha gating, validation, and the
// write allow-list. Supabase is mocked; env is controlled per test.
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Supabase mock -----------------------------------------------------------
const rpcMock = vi.fn();
const insertResult = { data: null as unknown, error: null as unknown };
// What the ip_blocks lookup resolves to: data null = not blocked.
const blockedResult = { data: null as unknown, error: null as unknown };

function tableMock() {
  const target = {
    insert: vi.fn((_row: Record<string, unknown>): unknown => proxy),
    select: vi.fn((_cols?: unknown): unknown => proxy),
    eq: vi.fn((_col: unknown, _val: unknown): unknown => proxy),
    single: vi.fn(async () => ({ ...insertResult })),
    maybeSingle: vi.fn(async () => ({ ...blockedResult })),
  };
  // Awaiting any point in the chain (e.g. `await from().insert(row)` with no
  // .select()) resolves like a PostgREST query result.
  const proxy: typeof target = new Proxy(target, {
    get(t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve({ ...insertResult });
      }
      return t[prop as keyof typeof t];
    },
  });
  return proxy;
}

// One stable mock per table name, so tests can assert on the table they care
// about regardless of what else the route touched first (e.g. ip_blocks).
const tables = new Map<string, ReturnType<typeof tableMock>>();
const fromMock = vi.fn((name: string) => {
  let t = tables.get(name);
  if (!t) {
    t = tableMock();
    tables.set(name, t);
  }
  return t;
});

const uploadMock = vi.fn(async () => ({ error: null }));
const storageMock = {
  from: vi.fn(() => ({
    upload: uploadMock,
    getPublicUrl: vi.fn(() => ({
      data: {
        publicUrl:
          "https://test.supabase.co/storage/v1/object/public/tolet-photos/x.jpg",
      },
    })),
  })),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ rpc: rpcMock, from: fromMock, storage: storageMock })),
}));

const { POST } = await import("@/app/api/submit/route");

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
    // Route handlers accept the web Request; NextRequest only adds sugar.
  }) as never;
}

const VALID_PIN = {
  kind: "pin",
  payload: { lat: 18.52, lng: 73.85, rent: 30000, bhk: "1BHK", housing_type: "Society" },
};

beforeEach(() => {
  vi.clearAllMocks();
  tables.clear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  delete process.env.TURNSTILE_SECRET_KEY;
  rpcMock.mockResolvedValue({ data: true, error: null }); // rate limit: allowed
  insertResult.data = { id: "new-row" };
  insertResult.error = null;
  blockedResult.data = null; // ip_blocks: not blocked
  blockedResult.error = null;
});

describe("IP blocklist", () => {
  it("refuses a blocked connection with 403 before rate limiting", async () => {
    blockedResult.data = { ip_hash: "deadbeef" };
    const res = await POST(request(VALID_PIN));
    expect(res.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled(); // no write_log row consumed
    expect(tables.get("rent_pins")).toBeUndefined(); // nothing inserted
  });

  it("proceeds when the ip_blocks table is missing (schema v7 not applied)", async () => {
    blockedResult.error = { message: "relation ip_blocks does not exist" };
    const res = await POST(request(VALID_PIN));
    expect(res.status).toBe(200);
  });
});

describe("configuration and input guards", () => {
  it("returns 501 when the service key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await POST(request(VALID_PIN));
    expect(res.status).toBe(501);
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await POST(request("{not json"));
    expect(res.status).toBe(400);
  });

  it("rejects an unknown kind with 400", async () => {
    const res = await POST(request({ kind: "drop_table", payload: {} }));
    expect(res.status).toBe(400);
  });

  it("rejects a missing kind with 400", async () => {
    const res = await POST(request({ payload: {} }));
    expect(res.status).toBe(400);
  });
});

describe("rate limiting", () => {
  it("returns 429 when the limiter says no", async () => {
    rpcMock.mockResolvedValueOnce({ data: false, error: null });
    const res = await POST(request(VALID_PIN));
    expect(res.status).toBe(429);
  });

  it("returns 500 when the limiter itself errors", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const res = await POST(request(VALID_PIN));
    expect(res.status).toBe(500);
  });

  it("hashes the client IP before passing it to the limiter", async () => {
    await POST(request(VALID_PIN, { "x-forwarded-for": "1.2.3.4, 10.0.0.1" }));
    const args = rpcMock.mock.calls[0][1];
    expect(args.p_action).toBe("pin");
    expect(args.p_ip).toMatch(/^[a-f0-9]{64}$/); // sha256, not the raw IP
    expect(args.p_ip).not.toContain("1.2.3.4");
  });
});

describe("captcha gating", () => {
  it("blocks captcha-protected kinds when a secret is set and no token sent", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const res = await POST(request(VALID_PIN));
    expect(res.status).toBe(403);
  });

  it("does not require captcha for ratings/reports", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret";
    const res = await POST(
      request({ kind: "rating", payload: { pin_id: "abc", rating: 4 } })
    );
    expect(res.status).toBe(200);
  });

  it("skips captcha entirely when not configured", async () => {
    const res = await POST(request(VALID_PIN));
    expect(res.status).toBe(200);
  });
});

describe("email validation", () => {
  const cases = [
    ["listing", { lat: 18.52, lng: 73.85, contact_email: "not-an-email" }],
    ["seeker", { lat: 18.52, lng: 73.85, contact_email: "a@b" }],
    ["alert", { lat: 18.52, lng: 73.85, email: "" }],
    ["alert", { lat: 18.52, lng: 73.85, email: "a b@c.com" }],
  ] as const;

  for (const [kind, payload] of cases) {
    it(`rejects bad email for ${kind}: ${JSON.stringify(payload)}`, async () => {
      const res = await POST(request({ kind, payload }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/email/i);
    });
  }

  it("accepts a valid listing email", async () => {
    const res = await POST(
      request({
        kind: "listing",
        payload: { lat: 18.52, lng: 73.85, rent: 30000, bhk: "1BHK", contact_email: "a@b.co" },
      })
    );
    expect(res.status).toBe(200);
  });

  it("rejects emails longer than 254 chars", async () => {
    const res = await POST(
      request({
        kind: "alert",
        payload: { lat: 18.52, lng: 73.85, email: "x".repeat(250) + "@b.co" },
      })
    );
    expect(res.status).toBe(400);
  });
});

describe("location validation", () => {
  it("rejects coordinates in open water", async () => {
    const res = await POST(
      request({
        kind: "pin",
        payload: { ...VALID_PIN.payload, lat: 18.4302, lng: 73.7451 }, // Khadakwasla reservoir
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/water/i);
  });

  it("rejects a point whose ~100m rounding lands in water", async () => {
    // Raw point is on land in the mask, but rounding shifts it into a water
    // cell - the stored (rounded) location is what must be on land.
    const res = await POST(
      request({
        kind: "pin",
        payload: { ...VALID_PIN.payload, lat: 18.4484, lng: 73.7702 },
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/water/i);
  });

  it("rejects coordinates in a public place", async () => {
    const res = await POST(
      request({
        kind: "pin",
        payload: { ...VALID_PIN.payload, lat: 18.4482, lng: 73.8605 }, // Rajiv Gandhi Zoological Park, Katraj
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/public place/i);
  });

  it("rejects non-numeric coordinates", async () => {
    const res = await POST(
      request({ kind: "pin", payload: { ...VALID_PIN.payload, lat: "18.52" } })
    );
    expect(res.status).toBe(400);
  });

  it("rounds coordinates to ~100m server-side (privacy)", async () => {
    await POST(
      request({
        kind: "pin",
        payload: { ...VALID_PIN.payload, lat: 18.5201234, lng: 73.8499876 },
      })
    );
    const table = tables.get("rent_pins")!;
    const inserted = table.insert.mock.calls[0][0];
    expect(inserted.lat).toBe(18.52);
    expect(inserted.lng).toBe(73.85);
  });
});

describe("phone normalization", () => {
  it("normalizes a 10-digit Indian mobile to E.164", async () => {
    await POST(
      request({
        kind: "listing",
        payload: {
          lat: 18.52, lng: 73.85, rent: 30000, bhk: "1BHK",
          contact_email: "a@b.co", contact_phone: "98123 45678",
        },
      })
    );
    const table = tables.get("listings")!;
    expect(table.insert.mock.calls[0][0].contact_phone).toBe("+919812345678");
  });

  it("rejects a phone that can't be normalized (HTML injection guard)", async () => {
    const res = await POST(
      request({
        kind: "seeker",
        payload: {
          lat: 18.52, lng: 73.85, budget_max: 30000, bhk: "1BHK",
          contact_email: "a@b.co", contact_phone: "<img src=x>",
        },
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/phone/i);
  });

  it("passes null through for an omitted phone", async () => {
    const res = await POST(
      request({
        kind: "listing",
        payload: { lat: 18.52, lng: 73.85, rent: 30000, bhk: "1BHK", contact_email: "a@b.co" },
      })
    );
    expect(res.status).toBe(200);
    const table = tables.get("listings")!;
    expect(table.insert.mock.calls[0][0].contact_phone).toBeNull();
  });
});

describe("seeker profile (interest flow)", () => {
  it("accepts the optional profile fields and keeps them on the row", async () => {
    const res = await POST(
      request({
        kind: "seeker",
        payload: {
          lat: 18.52, lng: 73.85, budget_max: 30000, bhk: "2BHK",
          room_ok: true, contact_email: "a@b.co", contact_phone: "9812345678",
          move_in: "ASAP", food_pref: "Veg", smoker_pref: "Non-smoker",
          gender: "Female", flatmate_gender: "Female",
          parking_needed: true, lifestyle: "Night owl, WFH",
        },
      })
    );
    expect(res.status).toBe(200);
    const table = tables.get("seekers")!;
    const inserted = table.insert.mock.calls[0][0];
    expect(inserted.move_in).toBe("ASAP");
    expect(inserted.flatmate_gender).toBe("Female");
    expect(inserted.lifestyle).toBe("Night owl, WFH");
  });
});

describe("field allow-list (mass-assignment protection)", () => {
  it("strips fields not on the pin allow-list", async () => {
    await POST(
      request({
        kind: "pin",
        payload: { ...VALID_PIN.payload, hidden: false, report_count: 99, id: "hack" },
      })
    );
    const table = tables.get("rent_pins")!;
    const inserted = table.insert.mock.calls[0][0];
    expect(inserted).not.toHaveProperty("hidden");
    expect(inserted).not.toHaveProperty("report_count");
    expect(inserted).not.toHaveProperty("id");
    expect(inserted.rent).toBe(30000);
  });

  it("strips active_until/hidden from listings", async () => {
    await POST(
      request({
        kind: "listing",
        payload: {
          lat: 18.52, lng: 73.85, rent: 30000, bhk: "1BHK",
          contact_email: "a@b.co", hidden: false, active_until: "2099-01-01",
        },
      })
    );
    const table = tables.get("listings")!;
    const inserted = table.insert.mock.calls[0][0];
    expect(inserted).not.toHaveProperty("hidden");
    expect(inserted).not.toHaveProperty("active_until");
  });
});

describe("to-let photos (uploaded server-side)", () => {
  // A minimal buffer with the JPEG magic bytes (ff d8).
  const JPEG_B64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 1, 2, 3]).toString("base64");

  it("uploads valid JPEG photo_data and stores the bucket URL", async () => {
    const res = await POST(
      request({
        kind: "tolet",
        payload: {
          lat: 18.52, lng: 73.85,
          photo_data: `data:image/jpeg;base64,${JPEG_B64}`,
        },
      })
    );
    expect(res.status).toBe(200);
    expect(uploadMock).toHaveBeenCalledOnce();
    const table = tables.get("tolet_spots")!;
    expect(table.insert.mock.calls[0][0].photo_url).toContain("tolet-photos");
  });

  it("rejects photo_data that is not a JPEG", async () => {
    const res = await POST(
      request({
        kind: "tolet",
        payload: {
          lat: 18.52, lng: 73.85,
          photo_data: Buffer.from("<svg onload=alert(1)>").toString("base64"),
        },
      })
    );
    expect(res.status).toBe(400);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied photo_url (no hotlinking)", async () => {
    const res = await POST(
      request({
        kind: "tolet",
        payload: { lat: 18.52, lng: 73.85, photo_url: "https://evil.example/x.jpg" },
      })
    );
    expect(res.status).toBe(200);
    const table = tables.get("tolet_spots")!;
    expect(table.insert.mock.calls[0][0].photo_url).toBeNull();
  });

  it("accepts a to-let spot with no photo", async () => {
    const res = await POST(
      request({ kind: "tolet", payload: { lat: 18.52, lng: 73.85 } })
    );
    expect(res.status).toBe(200);
  });
});

describe("area alerts", () => {
  it("treats duplicate subscriptions (23505) as success", async () => {
    insertResult.error = { code: "23505", message: "duplicate" };
    const res = await POST(
      request({ kind: "alert", payload: { lat: 18.52, lng: 73.85, email: "a@b.co" } })
    );
    expect(res.status).toBe(200);
  });

  it("propagates other insert errors", async () => {
    insertResult.error = { code: "23514", message: "check violation" };
    const res = await POST(
      request({ kind: "alert", payload: { lat: 18.52, lng: 73.85, email: "a@b.co" } })
    );
    expect(res.status).toBe(400);
  });
});
