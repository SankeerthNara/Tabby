import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeSession, encodeSession, SESSION_SECONDS } from "./session.ts";

const secret = "x".repeat(32);
const user = { id: "u1", name: "Sam", email: "sam@example.com" };

test("round-trips a valid session", () => {
  assert.deepEqual(decodeSession(encodeSession(user, secret), secret), user);
});

test("rejects tampering, wrong secret, expiry and junk", () => {
  const raw = encodeSession(user, secret, 0);
  const [body, sig] = raw.split(".");
  const forged = Buffer.from(JSON.stringify({ user: { ...user, id: "admin" }, exp: Date.now() + 1e9 })).toString("base64url");
  assert.equal(decodeSession(`${forged}.${sig}`, secret, 0), null);
  assert.equal(decodeSession(raw, "y".repeat(32), 0), null);
  assert.equal(decodeSession(raw, secret, SESSION_SECONDS * 1000 + 1), null);
  assert.equal(decodeSession(`${body}`, secret), null);
  assert.equal(decodeSession(undefined, secret), null);
});
