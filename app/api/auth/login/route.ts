import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { loginUrl } from "@/lib/paypal";

const STATE_COOKIE = "tabby_oauth_state";

// Starts "Log in with PayPal". The state cookie guards the callback against forged logins.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next");
  const state = randomUUID();
  const res = NextResponse.redirect(loginUrl(`${url.origin}/api/auth/callback`, state));
  const opts = { httpOnly: true, secure: url.protocol === "https:", sameSite: "lax" as const, maxAge: 600, path: "/" };
  res.cookies.set(STATE_COOKIE, state, opts);
  // only same-site paths, so the login can't bounce users to another site
  res.cookies.set("tabby_next", next?.startsWith("/") && !next.startsWith("//") ? next : "/", opts);
  return res;
}
