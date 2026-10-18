import { z } from "zod";
import { invoiceFx, sendInvoice } from "@/lib/paypal";

const Body = z.object({
  currency: z.string().length(3),
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
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Every friend needs a valid email and something to pay." }, { status: 400 });
  const { shares, currency, merchant } = parsed.data;

  let fx;
  try {
    fx = await invoiceFx(currency);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
  const results = await Promise.allSettled(shares.map((s) => sendInvoice(s, currency, merchant, fx)));
  return Response.json(
    results.map((r, i) => ({
      name: shares[i].name,
      email: shares[i].email,
      totalCents: shares[i].totalCents,
      ...(r.status === "fulfilled" ? { ...r.value, status: "SENT" } : { error: (r.reason as Error).message }),
    })),
  );
}
