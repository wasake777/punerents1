import { describe, expect, it } from "vitest";
import { deepLink, whatsappUrl } from "@/lib/share";

describe("deepLink", () => {
  it("builds a pin deep link with the canonical origin outside the browser", () => {
    expect(deepLink("pin", "abc-123")).toBe("https://punerents.com/?pin=abc-123");
  });

  it("builds a tolet deep link", () => {
    expect(deepLink("tolet", "spot-1")).toBe("https://punerents.com/?tolet=spot-1");
  });

  it("URL-encodes the id", () => {
    expect(deepLink("pin", "a b&c")).toBe("https://punerents.com/?pin=a%20b%26c");
  });
});

describe("whatsappUrl", () => {
  it("puts text and url on separate lines inside the wa.me link", () => {
    const url = whatsappUrl({ text: "2BHK at ₹35,000/month", url: "https://punerents.com/?pin=x" });
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    const decoded = decodeURIComponent(url.slice("https://wa.me/?text=".length));
    expect(decoded).toBe("2BHK at ₹35,000/month\nhttps://punerents.com/?pin=x");
  });
});
