import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { loginUser } from "@/lib/paypal";
import { encodeSession, SESSION_COOKIE, SESSION_SECONDS, sessionSecret } from "@/lib/session";

// PayPal sends the user back here with ?code&state after they log in.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const next = jar.get("tabby_next")?.value ?? "/";
  const fail = (why: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(why)}`, url.origin));

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return fail(url.searchParams.get("error_description") ?? "Login was cancelled.");
  if (!state || state !== jar.get("tabby_oauth_state")?.value) return fail("Login expired. Please try again.");

  try {
    const user = await loginUser(code);
    const res = NextResponse.redirect(new URL(next, url.origin));
    res.cookies.set(SESSION_COOKIE, encodeSession(user, sessionSecret()), {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      maxAge: SESSION_SECONDS,
      path: "/",
    });
    res.cookies.delete("tabby_oauth_state");
    res.cookies.delete("tabby_next");
    return res;
  } catch (e) {
    return fail((e as Error).message);
  }
}
