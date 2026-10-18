import { z } from "zod";
import { randomUUID } from "node:crypto";
import { currentUser } from "@/lib/auth";
import { invoiceFx, sendInvoice } from "@/lib/paypal";
import { saveFriends, saveSplit } from "@/lib/store";

const Body = z.object({
  currency: z.string().length(3),
  // who paid the restaurant; defaults to the logged-in user
  payer: z.object({ name: z.string().trim().min(1).max(40), email: z.string().email() }).optional(),
  merchant: z.string(),
  shares: z
    .array(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        totalCents: z.number().int().positive(),
        lines: z.array(z.object({ name: z.string().min(1), cents: z.number().int() })).min(1),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(req: Request) {
  // Sending needs a login so the split is saved to "My tabs" and only you can nudge for it.
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in with PayPal to send requests." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Every friend needs a valid email and something to pay." }, { status: 400 });
  const { shares, currency, merchant } = parsed.data;
  const payer = parsed.data.payer ?? { name: user.name, email: user.email };
  const paidByOther = payer.email.toLowerCase() !== user.email;

  let fx;
  try {
    fx = await invoiceFx(currency);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
  const results = await Promise.allSettled(shares.map((s) => sendInvoice(s, currency, merchant, fx, paidByOther ? payer.name : undefined)));
  const sent = results.map((r, i) => ({
    name: shares[i].name,
    email: shares[i].email,
    totalCents: shares[i].totalCents,
    ...(r.status === "fulfilled" ? { ...r.value, status: "SENT" } : { error: (r.reason as Error).message }),
  }));

  // Invoices are already out, so a storage failure is a warning, not an error.
  let saveError: string | undefined;
  const ok = sent.flatMap((s) => ("id" in s && s.id ? [{ ...s, invoiceId: s.id }] : []));
  if (ok.length) {
    try {
      await saveSplit({
        id: randomUUID(),
        owner: user,
        payer: { name: payer.name, email: payer.email.toLowerCase() },
        merchant,
        currency,
        createdAt: Date.now(),
        shares: ok.map(({ name, email, invoiceId, payUrl, totalCents, chargedCents, chargedCurrency }) => ({ name, email, invoiceId, payUrl, totalCents, chargedCents, chargedCurrency })),
      });
      // Everyone on the bill becomes a saved friend, so next time it's one tap.
      await saveFriends(user, [...shares.map(({ name, email }) => ({ name, email })), payer]);
    } catch (e) {
      saveError = `Requests sent, but couldn't save to My tabs: ${(e as Error).message}`;
    }
  }
  return Response.json({ sent, saveError });
}
