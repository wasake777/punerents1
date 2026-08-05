// Shared validation & sanitization helpers. Pure functions, safe to import
// from both client components and server routes - keep it dependency-free.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Light email sanity check; the 254-char cap matches the SMTP limit. */
export function isValidEmail(v: unknown): v is string {
  return typeof v === "string" && EMAIL_RE.test(v) && v.length <= 254;
}

/** "98XXXXXXXX" → "+9198XXXXXXXX"; already-E.164 numbers pass through. */
export function toE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\+\d{8,15}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
}

/** Escape user-supplied text before interpolating it into an HTML string. */
export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
