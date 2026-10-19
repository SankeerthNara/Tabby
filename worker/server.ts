// Tabby's background worker on Render: receives PayPal webhooks, so a friend's payment is forwarded to
// whoever paid the bill even when nobody has Tabby open, and runs the daily reminder job when asked.
// Runs lib/*.ts directly on Node 24 (no build, no deps).
import { timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { invoiceStatus, verifyWebhook } from "../lib/paypal.ts";
import { settle } from "../lib/settle.ts";
import { runReminders } from "./remind.ts";

const sameSecret = (given: string, expected: string) =>
  given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));

const PAID_EVENTS = new Set(["INVOICING.INVOICE.PAID", "INVOICING.INVOICE.UPDATED"]);

// Re-reads the invoice from PayPal rather than trusting the event body, then forwards the money if it's PAID.
export async function handleEvent(event: { event_type?: string; resource?: { id?: string; invoice?: { id?: string } } }) {
  if (!PAID_EVENTS.has(event.event_type ?? "")) return "ignored";
  const id = event.resource?.invoice?.id ?? event.resource?.id;
  if (!id) return "no invoice id";
  const status = await invoiceStatus(id);
  const payouts = await settle([status]);
  return `${id}: ${status.status}${payouts.get(id) ? `, payout ${payouts.get(id)!.status}` : ""}`;
}

const server = createServer(async (req, res) => {
  const reply = (code: number, text: string) => res.writeHead(code, { "Content-Type": "text/plain" }).end(text);
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) return reply(200, "ok");
  // Daily reminders, called by the scheduled GitHub Action with a shared secret (free alternative to a paid cron job).
  if (req.method === "POST" && req.url === "/tasks/remind") {
    const secret = process.env.REMINDER_SECRET;
    if (!secret) return reply(503, "reminders not configured");
    if (!sameSecret(String(req.headers.authorization ?? ""), `Bearer ${secret}`)) return reply(401, "unauthorized");
    try {
      const result = await runReminders(false);
      console.log(new Date().toISOString(), "reminders:", result);
      return reply(200, result);
    } catch (e) {
      console.error("reminders failed:", (e as Error).message);
      return reply(500, "error");
    }
  }
  if (req.method !== "POST" || req.url !== "/paypal/webhook") return reply(404, "not found");

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return reply(503, "webhook not configured");
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) return reply(413, "too large");
  }
  try {
    const event = JSON.parse(body);
    if (!(await verifyWebhook(req.headers, event, webhookId))) return reply(400, "signature check failed");
    const result = await handleEvent(event);
    console.log(new Date().toISOString(), event.event_type, result);
    reply(200, result);
  } catch (e) {
    console.error("webhook failed:", (e as Error).message);
    reply(500, "error"); // PayPal retries failed deliveries
  }
});

if (process.argv[1]?.endsWith("server.ts")) {
  const port = Number(process.env.PORT ?? 10000);
  server.listen(port, () => console.log(`Tabby worker listening on ${port}`));
}
