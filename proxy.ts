import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE, sessionSecret } from "./lib/session";

// Login gate: the app pages need a session; the login page is only for logged-out visitors.
export function proxy(req: NextRequest) {
  let loggedIn = false;
  try {
    loggedIn = !!decodeSession(req.cookies.get(SESSION_COOKIE)?.value, sessionSecret());
  } catch {
    // missing secret: treat everyone as logged out rather than accept unsigned cookies
  }
  const { pathname, search } = req.nextUrl;
  if (pathname === "/login") return loggedIn ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  if (loggedIn) return NextResponse.next();
  const login = new URL(`/login${search}`, req.url);
  if (pathname !== "/") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/", "/tabs", "/login"] };
