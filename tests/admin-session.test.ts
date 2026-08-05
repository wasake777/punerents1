import { describe, expect, it } from "vitest";
import { mintSession, verifySession } from "@/lib/adminSession";

describe("admin session tokens", () => {
  it("round-trips a freshly minted token", async () => {
    const token = await mintSession("hunter2");
    expect(await verifySession(token, "hunter2")).toBe(true);
  });

  it("rejects a token signed with a different password", async () => {
    const token = await mintSession("hunter2");
    expect(await verifySession(token, "other-password")).toBe(false);
  });

  it("rejects a tampered expiry", async () => {
    const token = await mintSession("hunter2");
    const [, sig] = token.split(".");
    const farFuture = Date.now() + 1000 * 86400_000;
    expect(await verifySession(`${farFuture}.${sig}`, "hunter2")).toBe(false);
  });

  it("rejects an expired token", async () => {
    // Hand-build a token whose expiry is in the past; the signature itself is
    // irrelevant because the expiry check runs first.
    expect(await verifySession(`${Date.now() - 1000}.deadbeef`, "hunter2")).toBe(
      false
    );
  });

  it("rejects malformed tokens", async () => {
    expect(await verifySession("", "hunter2")).toBe(false);
    expect(await verifySession("no-dot", "hunter2")).toBe(false);
    expect(await verifySession(".sig-only", "hunter2")).toBe(false);
  });
});
