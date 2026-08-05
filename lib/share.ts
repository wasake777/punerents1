// Share helpers. WhatsApp gets a dedicated button because it's the default
// channel here; everything else goes through the OS share sheet
// (navigator.share) with a clipboard fallback on desktop browsers.

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

// Deep link that reopens the app with this pin/spot selected (handled in App).
export function deepLink(param: "pin" | "tolet", id: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://punerents.com";
  return `${origin}/?${param}=${encodeURIComponent(id)}`;
}

export function whatsappUrl({ text, url }: Pick<SharePayload, "text" | "url">): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export type ShareResult = "shared" | "dismissed" | "copied" | "failed";

export async function share(payload: SharePayload): Promise<ShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (e) {
      // User closed the share sheet - nothing to fall back to.
      if (e instanceof DOMException && e.name === "AbortError") return "dismissed";
      // NotAllowedError etc. → fall through to clipboard.
    }
  }
  try {
    await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
