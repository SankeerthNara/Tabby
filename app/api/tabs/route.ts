import { currentUser } from "@/lib/auth";
import { invoiceStatus } from "@/lib/paypal";
import { payerOf, splitsBilledTo, splitsPaidBy } from "@/lib/store";

// "My tabs": splits you paid for and splits you were billed in, with live status from PayPal.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in with PayPal to see your tabs." }, { status: 401 });
  try {
    const [paid, billed] = await Promise.all([splitsPaidBy(user), splitsBilledTo(user)]);
    // In "You owe", only show your own line of each split.
    const owe = billed
      .filter((s) => payerOf(s).email.toLowerCase() !== user.email)
      .map((s) => ({ ...s, payer: payerOf(s), shares: s.shares.filter((sh) => sh.email.toLowerCase() === user.email) }))
      .filter((s) => s.shares.length);

    const ids = [...new Set([...paid, ...owe].flatMap((s) => s.shares.map((sh) => sh.invoiceId)))];
    const statuses = await Promise.allSettled(ids.map(invoiceStatus));
    const status = new Map(statuses.flatMap((r) => (r.status === "fulfilled" ? [[r.value.id, r.value.status] as const] : [])));
    const withStatus = <T extends { shares: { invoiceId: string }[] }>(list: T[]) =>
      list.map((s) => ({ ...s, shares: s.shares.map((sh) => ({ ...sh, status: status.get(sh.invoiceId) ?? "UNKNOWN" })) }));

    return Response.json({ user, paid: withStatus(paid), owe: withStatus(owe) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
