import type { Share } from "./split";

const BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";

let cached = { value: "", expires: 0 };

async function token(): Promise<string> {
  if (Date.now() < cached.expires) return cached.value;
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status}). Check PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET.`);
  const { access_token, expires_in } = await res.json();
  cached = { value: access_token, expires: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
}

async function call(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = res.status === 204 ? {} : await res.json();
  if (!res.ok) throw new Error(`PayPal ${method} ${path} failed: ${data.message ?? res.status} ${JSON.stringify(data.details ?? "")}`);
  return data;
}

const money = (cents: number, currency: string) => ({ currency_code: currency, value: (cents / 100).toFixed(2) });

// shortcut: a negative line (discount bigger than tax+tip) is rejected by PayPal; fold it into an invoice discount if that shows up.
export async function sendInvoice(share: Share, currency: string, merchant: string) {
  const invoice = await call("/v2/invoicing/invoices", "POST", {
    detail: { currency_code: currency, note: `Your share of ${merchant || "the bill"}, split by Tabby.` },
    primary_recipients: [{ billing_info: { email_address: share.email, name: { given_name: share.name } } }],
    items: share.lines.map((l) => ({ name: l.name.slice(0, 200), quantity: "1", unit_amount: money(l.cents, currency) })),
  });
  try {
    await call(`/v2/invoicing/invoices/${invoice.id}/send`, "POST", { send_to_invoicer: false, send_to_recipient: true });
  } catch (e) {
    await call(`/v2/invoicing/invoices/${invoice.id}`, "DELETE").catch(() => {}); // don't leave orphan drafts
    throw e;
  }
  return { id: invoice.id as string, payUrl: invoice.detail?.metadata?.recipient_view_url as string | undefined };
}

export async function invoiceStatus(id: string) {
  const inv = await call(`/v2/invoicing/invoices/${encodeURIComponent(id)}`);
  return { id, status: inv.status as string, payUrl: inv.detail?.metadata?.recipient_view_url as string | undefined };
}

export function remind(id: string) {
  return call(`/v2/invoicing/invoices/${encodeURIComponent(id)}/remind`, "POST", {
    note: "Friendly nudge from Tabby: your share of the bill is still open.",
    send_to_invoicer: false,
    send_to_recipient: true,
  });
}
