import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE, sessionSecret, type User } from "./session";

export async function currentUser(): Promise<User | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value, sessionSecret());
}
