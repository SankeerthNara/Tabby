import { createHmac, timingSafeEqual } from "node:crypto";

// Signed-cookie sessions: the cookie holds the user and an expiry, plus an HMAC so it can't be forged.
export type User = { id: string; name: string; email: string };

export const SESSION_COOKIE = "tabby_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("base64url");

export function encodeSession(user: User, secret: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ user, exp: now + SESSION_SECONDS * 1000 })).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function decodeSession(raw: string | undefined, secret: string, now = Date.now()): User | null {
  const [body, sig] = (raw ?? "").split(".");
  if (!body || !sig) return null;
  const want = Buffer.from(sign(body, secret));
  const got = Buffer.from(sig);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const { user, exp } = JSON.parse(Buffer.from(body, "base64url").toString());
    return exp > now ? user : null;
  } catch {
    return null;
  }
}

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is missing or shorter than 32 characters.");
  return s;
}
