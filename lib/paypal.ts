import { allocate, type Share } from "./split";

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
const show = (cents: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

// Currencies PayPal Invoicing accepts with 2 decimals (JPY/HUF/TWD are whole-unit only, so they get converted too).
const INVOICE_CURRENCIES = new Set(["AUD", "BRL", "CAD", "CNY", "CZK", "DKK", "EUR", "HKD", "ILS", "MYR", "MXN", "NZD", "NOK", "PHP", "PLN", "GBP", "SGD", "SEK", "CHF", "THB", "USD"]);

export type Fx = { currency: string; rate: number };

// Receipts in a currency PayPal can't invoice (e.g. INR) are billed in USD.
// PayPal's own FX quote needs a partner contract, so this uses ECB reference rates via Frankfurter (no key).
export async function invoiceFx(currency: string): Promise<Fx> {
  if (INVOICE_CURRENCIES.has(currency)) return { currency, rate: 1 };
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(currency)}&symbols=USD`);
  const rate = res.ok ? (await res.json()).rates?.USD : undefined;
  if (!rate) throw new Error(`PayPal can't invoice in ${currency}, and no USD exchange rate was found for it.`);
  return { currency: "USD", rate };
}

// shortcut: a negative line (discount bigger than tax+tip) is rejected by PayPal; fold it into an invoice discount if that shows up.
export async function sendInvoice(share: Share, currency: string, merchant: string, fx: Fx = { currency, rate: 1 }, paidBy?: string) {
  const converted = fx.currency !== currency;
  const chargedCents = converted ? Math.round(share.totalCents * fx.rate) : share.totalCents;
  // Spread the converted total over the lines so they still add up exactly.
  const lineCents = converted ? allocate(chargedCents, share.lines.map((l) => l.cents)) : share.lines.map((l) => l.cents);
  const note = `Your share of ${merchant || "the bill"}${paidBy ? `, paid by ${paidBy}` : ""}, split by Tabby.` + (converted ? ` Converted from ${show(share.totalCents, currency)} at 1 ${currency} = ${fx.rate} USD (ECB rate).` : "");
  const invoice = await call("/v2/invoicing/invoices", "POST", {
    detail: { currency_code: fx.currency, note },
    primary_recipients: [{ billing_info: { email_address: share.email, name: { given_name: share.name } } }],
    items: share.lines.map((l, i) => ({ name: l.name.slice(0, 200), quantity: "1", unit_amount: money(lineCents[i], fx.currency) })),
  });
  try {
    await call(`/v2/invoicing/invoices/${invoice.id}/send`, "POST", { send_to_invoicer: false, send_to_recipient: true });
  } catch (e) {
    await call(`/v2/invoicing/invoices/${invoice.id}`, "DELETE").catch(() => {}); // don't leave orphan drafts
    throw e;
  }
  return {
    id: invoice.id as string,
    payUrl: invoice.detail?.metadata?.recipient_view_url as string | undefined,
    chargedCents,
    chargedCurrency: fx.currency,
  };
}

// ---- Log in with PayPal (OpenID Connect) ----
const WEB = BASE.replace("api-m.", "www."); // https://www.sandbox.paypal.com or https://www.paypal.com

export function loginUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({
    flowEntry: "static",
    client_id: process.env.PAYPAL_CLIENT_ID ?? "",
    response_type: "code",
    scope: "openid profile email",
    redirect_uri: redirectUri,
    state,
  });
  return `${WEB}/signin/authorize?${q}`;
}

// Trade the login code for the user's PayPal identity (id, name, verified email).
export async function loginUser(code: string): Promise<{ id: string; name: string; email: string }> {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const tok = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
  });
  if (!tok.ok) throw new Error(`PayPal login failed (${tok.status}).`);
  const { access_token } = await tok.json();
  const res = await fetch(`${BASE}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!res.ok) throw new Error(`PayPal profile lookup failed (${res.status}).`);
  const info = await res.json();
  const emails: { value: string; primary?: boolean }[] = info.emails ?? [];
  const email = (emails.find((e) => e.primary) ?? emails[0])?.value ?? info.email;
  if (!info.user_id || !email) throw new Error("PayPal didn't share your email. Enable the Email scope for Log in with PayPal.");
  return { id: info.user_id, name: info.name || email, email: email.toLowerCase() };
}

export async function invoiceStatus(id: string) {
  const inv = await call(`/v2/invoicing/invoices/${encodeURIComponent(id)}`);
  return {
    id,
    status: inv.status as string,
    payUrl: inv.detail?.metadata?.recipient_view_url as string | undefined,
    amountCents: Math.round(Number(inv.amount?.value ?? 0) * 100),
    currency: (inv.amount?.currency_code ?? inv.detail?.currency_code) as string,
  };
}

// ---- Payouts: forward a friend's payment to whoever paid the restaurant ----
// sender_batch_id is tied to the invoice, so PayPal itself refuses to pay the same invoice out twice.
export async function sendPayout(invoiceId: string, to: string, cents: number, currency: string, note: string) {
  const r = await call("/v1/payments/payouts", "POST", {
    sender_batch_header: {
      sender_batch_id: `tabby-${invoiceId}`,
      email_subject: "You've been paid back on Tabby",
      email_message: note,
    },
    items: [{ recipient_type: "EMAIL", amount: { value: (cents / 100).toFixed(2), currency }, receiver: to, note, sender_item_id: invoiceId }],
  });
  return { batchId: r.batch_header.payout_batch_id as string, status: r.batch_header.batch_status as string };
}

export async function payoutStatus(batchId: string): Promise<string> {
  const r = await call(`/v1/payments/payouts/${encodeURIComponent(batchId)}`);
  return (r.items?.[0]?.transaction_status ?? r.batch_header?.batch_status) as string;
}

export function remind(id: string) {
  return call(`/v2/invoicing/invoices/${encodeURIComponent(id)}/remind`, "POST", {
    note: "Friendly nudge from Tabby: your share of the bill is still open.",
    send_to_invoicer: false,
    send_to_recipient: true,
  });
}
