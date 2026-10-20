# Tabby 🐱 — the AI that settles the tab

Snap a receipt, say who had what. Tabby's AI splits the bill and sends everyone an itemized PayPal request, forwards the money to whoever paid, and nudges anyone who's slow to pay. No math, no awkward chasing.

- **Live demo:** https://tabby-eta-five.vercel.app — press **Try the demo** on the login page (shared demo account, no PayPal login needed), or log in with a PayPal sandbox account.
- **Demo video:** _YouTube link added at submission_
- Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) · runs on the PayPal **sandbox**, no real money moves.

## What it does

1. **Snap** — upload a photo of the receipt. Gemini (vision) reads every line, with quantities ("3 x Fish Tacos"), tax, tip and total, in any currency.
2. **Type it or say it** — pick friends or a saved group, then type or speak who had what: *"Of the 3 fish tacos, John had 2 and Priya had 1… add 18% tip."* Corrections work too: *"Oh wait, John had one of the lemonades, not Priya. Make the tip 20%."* Gemini maps the sentence onto the receipt lines (schema-validated, so it can't invent people) and asks when something is ambiguous.
3. **Split** — plain, unit-tested code does the money in integer cents: shared lines split by units, tax and tip spread in proportion, rounding by largest remainder so shares always add up to the receipt total.
4. **Review** — an editable **AG Grid**: one row per receipt line, a column per person. Fix any price, name, or who had how many, and every share re-splits instantly (no AI call).
5. **Send** — each friend gets an itemized **PayPal invoice** with their lines plus their share of tax and tip. Receipts in currencies PayPal can't invoice (e.g. INR) are billed in USD at the day's ECB rate.
6. **Paid → forwarded** — when a friend pays, Tabby forwards the money to whoever paid the restaurant with **PayPal Payouts**. A **PayPal webhook** to Tabby's worker on **Render** does this even when nobody has Tabby open.
7. **My tabs** — who owes you, what you owe, one-tap nudges, saved friends and groups, and a searchable, exportable **AG Grid ledger** of every request. Unpaid friends get an automatic reminder after 3 days, then every 3 days (up to 3 times).

## Tools used

| Tool | How Tabby uses it |
|---|---|
| **Google Gemini** (`@google/genai`) | Reads the receipt photo into structured lines, and turns "who had what" (typed or spoken) into per-line assignments. JSON-schema output validated with zod. Falls back across `gemini-3.5-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest`, then optionally Cloudflare Workers AI. |
| **PayPal: Log in with PayPal** | Sign-in (OpenID Connect); your name and PayPal email come from PayPal. |
| **PayPal: Invoicing API v2** | One itemized invoice per friend; status polling; reminders ("Nudge" and the daily job). |
| **PayPal: Payouts API** | Forwards each friend's payment to whoever paid the bill. Idempotent per invoice (`sender_batch_id = tabby-<invoiceId>`). |
| **PayPal: Webhooks** | `INVOICING.INVOICE.PAID` events to the Render worker, verified with PayPal's verify-webhook-signature API. |
| **AG Grid** (Community) | The review step (editable grid, per-person unit columns, pinned "Each pays" row) and the My tabs ledger (sort, quick search, CSV export, pinned open totals). Themed with Tabby's own tokens, light and dark. |
| **Render** | `tabby-worker` web service (`render.yaml`): PayPal webhook receiver and the daily reminder job. Runs Tabby's `lib/*.ts` directly on Node 24, no build step and no dependencies. |
| Vercel · Upstash Redis · GitHub Actions | Hosts the Next.js app · stores splits, friends, groups and payout state · calls the worker's reminder endpoint once a day (free alternative to a paid cron job). |
| Web Speech API · Frankfurter (ECB rates) | "Say it" voice input · currency conversion for invoices. |
| ElevenLabs · Remotion | Demo video only: narration and music, and the video edit (`video/`). |

## How it fits together

```
 Browser (Next.js 16 on Vercel)                    Render: tabby-worker (Node 24)
 ├─ /api/receipt  ─► Gemini (vision)               ├─ POST /paypal/webhook ◄── PayPal "invoice paid"
 ├─ /api/split    ─► Gemini (text) ─► lib/split    │     verify signature → re-read invoice → Payout
 ├─ /api/send     ─► PayPal Invoicing              └─ POST /tasks/remind   ◄── GitHub Actions, daily
 ├─ /api/invoices ─► PayPal status + Payouts             nudge unpaid friends, catch missed payments
 └─ /api/tabs     ─► Upstash Redis  ◄───────────────── shared lib/paypal.ts, lib/store.ts, lib/settle.ts
```

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in your keys (see the comments in the file)
npm run dev                  # http://localhost:3000
npm test                     # money math + reminder schedule tests
```

You need a Gemini API key (aistudio.google.com, free tier), a PayPal sandbox app (developer.paypal.com → Apps & Credentials; enable Invoicing, Payouts and Log in with PayPal with the email scope), a `SESSION_SECRET`, and a free Upstash Redis database. Create 2–3 sandbox **Personal** accounts as friends; log into sandbox.paypal.com as one to pay an invoice and watch it flip to "Paid ✓". Payouts need a sandbox **Business** account in a country that can send them (e.g. US).

### The worker (optional)

```bash
node --env-file=.env.local worker/server.ts                # webhook + reminder endpoints on :10000
DRY_RUN=1 node --env-file=.env.local worker/remind.ts      # list who would be nudged, send nothing
```

To deploy it: create the Render service from `render.yaml` and set its env vars; register `https://<worker>/paypal/webhook` for `INVOICING.INVOICE.PAID` in your PayPal app and set `PAYPAL_WEBHOOK_ID`; for daily reminders set `REMINDER_SECRET` on Render and add the same value as the GitHub Actions secret `REMINDER_SECRET`, plus the repository variable `WORKER_URL`.

## Project layout

| Path | What |
|---|---|
| `lib/split.ts` | money math in integer cents (tested in `lib/split.test.ts`) |
| `lib/ai.ts` | receipt reading and "who had what" (Gemini, with fallbacks) |
| `lib/paypal.ts` | OAuth, invoices, reminders, Payouts, webhook verification, Log in with PayPal |
| `lib/settle.ts` · `lib/reminders.ts` | forward paid invoices · when to nudge (tested) |
| `lib/store.ts` | Upstash Redis: splits, friends, groups, payouts, reminders |
| `app/page.tsx` · `app/ReviewGrid.tsx` | the split flow · the AG Grid review step |
| `app/tabs/` | My tabs, Friends, and the AG Grid `Ledger` |
| `worker/` · `render.yaml` | the Render worker and its blueprint |
| `.github/workflows/reminders.yml` | daily trigger for the reminder job |
| `video/` | the demo video (Remotion); see `video/script.md` |

## Notes

- Sandbox demo: requests are sent from Tabby's PayPal account and forwarded with Payouts. Sending from each person's own PayPal account in production would need PayPal's partner program.
- The "Try the demo" account is shared by everyone who presses the button.

## License

[MIT](LICENSE)
