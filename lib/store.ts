import type { User } from "./session";

// Tiny Upstash Redis client over its REST API (no package needed). Vercel's KV integration uses the KV_* names.
const URL_ = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

type Cmd = (string | number)[];

async function pipeline(cmds: Cmd[]): Promise<unknown[]> {
  if (!URL_ || !TOKEN) throw new Error("Saving splits isn't set up yet: add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Storage error (${res.status}).`);
  const out: { result?: unknown; error?: string }[] = await res.json();
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(`Storage error: ${failed.error}`);
  return out.map((r) => r.result);
}

export type SavedShare = {
  name: string;
  email: string;
  invoiceId: string;
  payUrl?: string;
  totalCents: number; // in the receipt's currency
  chargedCents: number; // what PayPal actually requested
  chargedCurrency: string;
};
export type Person = { name: string; email: string };
// owner = who created the split in Tabby; payer = who paid the restaurant (defaults to the owner).
// Older splits have no payer field: the owner paid.
export type SavedSplit = { id: string; owner: User; payer?: Person; merchant: string; currency: string; createdAt: number; shares: SavedShare[] };
export const payerOf = (s: SavedSplit): Person => s.payer ?? s.owner;

const lc = (email: string) => email.toLowerCase();

// Keys: split:<id> = JSON, paidby:<payerEmail> = splits that person paid for, owes:<email> = splits that email
// was billed in, user:<ownerId>:splits = splits that user created, invoice:<invoiceId> = who may nudge for it.
export async function saveSplit(split: SavedSplit) {
  const payer = lc(payerOf(split).email);
  await pipeline([
    ["SET", `split:${split.id}`, JSON.stringify(split)],
    ["LPUSH", `user:${split.owner.id}:splits`, split.id],
    ["LPUSH", `paidby:${payer}`, split.id],
    ...split.shares.flatMap((s): Cmd[] => [
      ["LPUSH", `owes:${lc(s.email)}`, split.id],
      ["SET", `invoice:${s.invoiceId}`, JSON.stringify({ by: split.owner.id, payer })],
    ]),
  ]);
}

async function splitsAt(...keys: string[]): Promise<SavedSplit[]> {
  const lists = (await pipeline(keys.map((k) => ["LRANGE", k, 0, 49]))) as string[][];
  const ids = [...new Set(lists.flat())];
  if (!ids.length) return [];
  const [raw] = (await pipeline([["MGET", ...ids.map((id) => `split:${id}`)]])) as (string | null)[][];
  return raw.flatMap((r) => (r ? [JSON.parse(r) as SavedSplit] : [])).sort((a, b) => b.createdAt - a.createdAt);
}

// Bills this person paid for (older splits are only indexed under the creator).
export const splitsPaidBy = async (user: User) =>
  (await splitsAt(`paidby:${lc(user.email)}`, `user:${user.id}:splits`)).filter((s) => lc(payerOf(s).email) === lc(user.email));
export const splitsBilledTo = (user: User) => splitsAt(`owes:${lc(user.email)}`);

// The person who created the split or the person who paid may nudge for it.
export async function canNudge(invoiceId: string, user: User): Promise<boolean> {
  const [raw] = (await pipeline([["GET", `invoice:${invoiceId}`]])) as (string | null)[];
  if (!raw) return false;
  if (!raw.startsWith("{")) return raw === user.id; // older entries stored just the creator id
  const { by, payer } = JSON.parse(raw);
  return by === user.id || payer === lc(user.email);
}

// ---- Saved friends and groups, per user ----
export type Friend = Person & { lastUsed: number };
export type Group = { id: string; name: string; members: Person[] };

export async function friendsAndGroups(user: User): Promise<{ friends: Friend[]; groups: Group[] }> {
  const [f, g] = (await pipeline([
    ["HVALS", `friends:${user.id}`],
    ["HVALS", `groups:${user.id}`],
  ])) as string[][];
  return {
    friends: f.map((x) => JSON.parse(x) as Friend).sort((a, b) => b.lastUsed - a.lastUsed),
    groups: g.map((x) => JSON.parse(x) as Group).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// Upsert friends by email (latest name wins); used when sending requests and from the Friends tab.
export async function saveFriends(user: User, people: Person[]) {
  const mine = people.filter((p) => lc(p.email) !== lc(user.email));
  if (!mine.length) return;
  const now = Date.now();
  await pipeline([["HSET", `friends:${user.id}`, ...mine.flatMap((p) => [lc(p.email), JSON.stringify({ name: p.name, email: lc(p.email), lastUsed: now })])]]);
}

export const deleteFriend = (user: User, email: string) => pipeline([["HDEL", `friends:${user.id}`, lc(email)]]);
export const saveGroup = (user: User, group: Group) => pipeline([["HSET", `groups:${user.id}`, group.id, JSON.stringify(group)]]);
export const deleteGroup = (user: User, id: string) => pipeline([["HDEL", `groups:${user.id}`, id]]);

// Fixed-window rate limit: true once `key` has been used more than `limit` times in `windowSec`.
export async function overLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const [count] = (await pipeline([
    ["INCR", `rl:${key}`],
    ["EXPIRE", `rl:${key}`, windowSec, "NX"],
  ])) as number[];
  return count > limit;
}
