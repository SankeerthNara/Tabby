import { cookies } from "next/headers";
import { decodeSession, DEMO_ID, SESSION_COOKIE, sessionSecret, type User } from "./session";
import { overLimit } from "./store";

export async function currentUser(): Promise<User | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value, sessionSecret());
}

const AI_CALLS_PER_HOUR = 40; // about 20 splits (one receipt read + one split each)

// Gate for the Gemini routes: logged-in users only, and a per-user hourly cap so nobody can drain the quota.
// The shared demo account is limited per device instead, so judges don't use up each other's allowance.
export async function guardAi(req: Request): Promise<Response | null> {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in with PayPal first." }, { status: 401 });
  const who = user.id === DEMO_ID ? `demo:${req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local"}` : user.id;
  try {
    if (await overLimit(`ai:${who}`, AI_CALLS_PER_HOUR, 3600))
      return Response.json({ error: "You've reached the hourly limit for AI splits. Please try again a bit later." }, { status: 429 });
  } catch {
    // storage down: don't block splitting over a rate-limit check
  }
  return null;
}
