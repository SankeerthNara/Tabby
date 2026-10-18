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
export type SavedSplit = { id: string; owner: User; merchant: string; currency: string; createdAt: number; shares: SavedShare[] };

// Keys: split:<id> = JSON, user:<payerId>:splits = list of ids, owes:<email> = splits that email was billed in,
// invoice:<invoiceId> = payer id (so only the payer can send reminders).
export async function saveSplit(split: SavedSplit) {
  await pipeline([
    ["SET", `split:${split.id}`, JSON.stringify(split)],
    ["LPUSH", `user:${split.owner.id}:splits`, split.id],
    ...split.shares.flatMap((s): Cmd[] => [
      ["LPUSH", `owes:${s.email.toLowerCase()}`, split.id],
      ["SET", `invoice:${s.invoiceId}`, split.owner.id],
    ]),
  ]);
}

async function splitsAt(key: string, limit = 50): Promise<SavedSplit[]> {
  const [ids] = (await pipeline([["LRANGE", key, 0, limit - 1]])) as string[][];
  if (!ids.length) return [];
  const [raw] = (await pipeline([["MGET", ...ids.map((id) => `split:${id}`)]])) as (string | null)[][];
  return raw.flatMap((r) => (r ? [JSON.parse(r) as SavedSplit] : []));
}

export const splitsPaidBy = (user: User) => splitsAt(`user:${user.id}:splits`);
export const splitsBilledTo = (user: User) => splitsAt(`owes:${user.email.toLowerCase()}`);

export async function invoiceOwner(invoiceId: string): Promise<string | null> {
  const [owner] = await pipeline([["GET", `invoice:${invoiceId}`]]);
  return (owner as string | null) ?? null;
}
