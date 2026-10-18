import { currentUser } from "@/lib/auth";
import { invoiceStatus, remind } from "@/lib/paypal";
import { settle } from "@/lib/settle";
import { canNudge, type Payout } from "@/lib/store";

const ID = /^[A-Z0-9-]{1,64}$/;

export async function GET(req: Request) {
  if (!(await currentUser())) return Response.json({ error: "Log in with PayPal first." }, { status: 401 });
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter((id) => ID.test(id)).slice(0, 20);
  const results = await Promise.allSettled(ids.map(invoiceStatus));
  const found = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  // The live board polls this, so a payment gets forwarded to whoever paid within seconds.
  const payouts = await settle(found).catch(() => new Map<string, Payout>());
  return Response.json(found.map((s) => ({ ...s, payout: payouts.get(s.id) })));
}

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || !ID.test(id)) return Response.json({ error: "Bad invoice id." }, { status: 400 });
  try {
    // Only whoever created the split, or whoever paid the bill, can nudge for it.
    const user = await currentUser();
    if (!user) return Response.json({ error: "Log in with PayPal to send reminders." }, { status: 401 });
    if (!(await canNudge(id, user))) return Response.json({ error: "That request isn't yours to nudge." }, { status: 403 });
    await remind(id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
