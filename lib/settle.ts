import { payoutStatus, sendPayout } from "./paypal.ts";
import { claimPayout, payoutIsFinal, payoutsFor, savePayout, type Payout } from "./store.ts";

type Status = { id: string; status: string; amountCents: number; currency: string };

// Friends pay Tabby's PayPal account; once an invoice is PAID through PayPal, forward that money to
// whoever paid the restaurant with a PayPal Payout. Runs whenever statuses are checked; safe to repeat.
// MARKED_AS_PAID (recorded by hand) moves no money, so it never triggers a payout.
export async function settle(statuses: Status[]): Promise<Map<string, Payout>> {
  // Off unless PAYPAL_PAYOUTS=1: the sending account must be in a country PayPal allows to send Payouts.
  if (process.env.PAYPAL_PAYOUTS !== "1") return new Map();
  await Promise.allSettled(
    statuses
      .filter((s) => s.status === "PAID" && s.amountCents > 0)
      .map(async (s) => {
        const to = await claimPayout(s.id);
        if (!to) return;
        const at = Date.now();
        try {
          const r = await sendPayout(s.id, to, s.amountCents, s.currency, "A friend paid their share of your bill on Tabby.");
          await savePayout(s.id, { status: r.status, to, at, batchId: r.batchId });
        } catch (e) {
          await savePayout(s.id, { status: "FAILED", to, at, error: (e as Error).message.slice(0, 300) });
        }
      }),
  );

  // Refresh payouts PayPal is still processing, then return everything we know.
  const payouts = await payoutsFor(statuses.map((s) => s.id));
  await Promise.allSettled(
    [...payouts].filter(([, p]) => p.batchId && !payoutIsFinal(p)).map(async ([id, p]) => {
      const status = await payoutStatus(p.batchId!);
      if (status && status !== p.status) {
        const next = { ...p, status };
        payouts.set(id, next);
        await savePayout(id, next);
      }
    }),
  );
  return payouts;
}
