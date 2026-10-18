import { NextResponse } from "next/server";
import { DEMO_ID, encodeSession, SESSION_COOKIE, sessionSecret } from "@/lib/session";

// "Try the demo": logs judges into a shared sandbox demo account without a PayPal login.
// Off unless NEXT_PUBLIC_DEMO_LOGIN=1, so it can be switched off after judging.
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (process.env.NEXT_PUBLIC_DEMO_LOGIN !== "1") {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("The demo account is turned off.")}`, url.origin), 303);
  }
  const user = {
    id: DEMO_ID,
    name: process.env.DEMO_NAME || "Demo judge",
    email: (process.env.DEMO_EMAIL || "demo@tabby.test").toLowerCase(),
  };
  const res = NextResponse.redirect(new URL("/", url.origin), 303);
  res.cookies.set(SESSION_COOKIE, encodeSession(user, sessionSecret()), {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return res;
}
