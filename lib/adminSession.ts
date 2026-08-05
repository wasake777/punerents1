// Admin session tokens: "<expiry-ms>.<hmac-hex>", signed with a key derived
// from ADMIN_PASSWORD. Uses Web Crypto only, so the exact same code runs in
// the edge middleware and in Node server actions.

export const SESSION_COOKIE = "pr_admin";
export const SESSION_MAX_AGE_S = 7 * 24 * 3600;

const enc = new TextEncoder();

async function sign(payload: string, password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`punerentss-admin|${password}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function mintSession(password: string): Promise<string> {
  const exp = Date.now() + SESSION_MAX_AGE_S * 1000;
  return `${exp}.${await sign(String(exp), password)}`;
}

export async function verifySession(
  token: string,
  password: string
): Promise<boolean> {
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const expected = await sign(exp, password);
  if (sig.length !== expected.length) return false;
  // Constant-time compare - don't leak how many hex chars matched.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
