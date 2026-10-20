# Devpost submission — Tabby

Copy each section into the matching Devpost field.

## Name
Tabby

## Elevator pitch (≤200 characters)
Snap a receipt, say who had what. Tabby's AI splits the bill and sends everyone a PayPal request, then nudges whoever hasn't paid. No math, no awkward chasing.

## Inspiration
Every group dinner ends the same way: one person pays, someone squints at the receipt doing math, and then the awkward part starts. "Who had the tacos?" "Did we tip?" "I'll pay you later." Bill-splitting apps still make you type every item and assign it by hand, and then you're on your own chasing the money. We wanted the whole thing, from receipt to money back in your account, to take less time than finishing dessert.

## What it does
- **Snap the receipt.** Gemini reads every line, including quantities ("3 x Fish Tacos"), tax, tip and the total, in any currency.
- **Type it or say it.** Pick your friends or a saved group and describe who had what in plain words: "Of the 3 fish tacos, John had 2 and Priya had 1… add 18% tip." Tap Say it to talk instead; Tabby even understands corrections like "Oh wait, John had one of the lemonades, not Priya. Make the tip 20%."
- **Exact split.** Shared items split by quantity; tax and tip are shared in proportion to what each person ordered; shares always add up to the receipt, to the cent.
- **Review in a grid.** If the AI misreads anything, fix it in an editable AG Grid (price, name, or who had how many) and everyone's share updates instantly.
- **Itemized PayPal requests.** Each friend gets a PayPal invoice listing their items plus their share of tax and tip. Receipts in currencies PayPal can't invoice (like Indian rupees) are billed in USD at the day's ECB rate.
- **Paid, then forwarded.** When a friend pays, Tabby forwards the money to whoever covered the bill with PayPal Payouts, triggered by a PayPal webhook, so it happens even when nobody has Tabby open.
- **My tabs.** Who owes you, what you owe, one-tap nudges, saved friends and groups, and a searchable, exportable ledger of every request. Friends who haven't paid get an automatic PayPal reminder after 3 days.
- **Log in with PayPal.** No new password.

## How we built it
- **Next.js 16 + React 19 + Tailwind**, deployed on **Vercel**.
- **Gemini** (`@google/genai`) with JSON-schema output validated by zod: one call reads the receipt image, another maps the "who had what" sentence onto receipt lines with per-person units. A model fallback chain (and an optional Cloudflare Workers AI fallback) keeps it working when one model is busy.
- **The money is plain code, not AI.** Integer cents, largest-remainder rounding, proportional tax and tip, with unit tests. The AI decides *who had what*; it never does arithmetic.
- **PayPal developer platform (sandbox):** Log in with PayPal (OpenID Connect), Invoicing API v2 (create, send, status, remind), Payouts API (idempotent per invoice), and Webhooks with signature verification.
- **AG Grid** for the review step and the ledger.
- **Render** runs `tabby-worker`, a dependency-free Node 24 service that reuses the app's own `lib/*.ts` to receive PayPal webhooks and run the daily reminder job (triggered by a scheduled GitHub Action).
- **Upstash Redis** stores splits, friends, groups and payout state.
- The demo video was made with **Remotion** from real screen recordings, with narration and music from **ElevenLabs**.

## Challenges we ran into
- **PayPal regions.** PayPal doesn't support domestic payments in India, so our first sandbox accounts couldn't receive invoices or send Payouts. We moved to US sandbox accounts and added automatic currency conversion so rupee receipts still work.
- **Making AI output trustworthy for money.** We split the job: AI only produces structured "who had which units of which line," validated against the receipt and the people at the table; all arithmetic is deterministic and tested.
- **"Paid" without a page open.** Polling only works while someone is watching, so we added a PayPal webhook receiver on Render that verifies each event, re-reads the invoice from PayPal, and forwards the money.
- **Quantities on receipts.** "3 x Veg Biryani" on one line and "2 x Veg Biryani" on another taught us to split by units, not by line.

## Accomplishments that we're proud of
- The full loop works end to end in the sandbox: receipt → AI split → itemized PayPal invoices → friend pays → money forwarded to the payer.
- Shares always reconcile with the receipt to the cent, including tax, tip and currency conversion.
- The review grid makes the AI's work transparent and fixable in seconds.

## What we learned
- Let the model do language and the code do math.
- Webhooks plus idempotent payouts (one batch ID per invoice) make "forward the money" safe to retry.
- Real screen recordings beat mockups for showing a product, but capture quality matters: we switched to a high-resolution screencast to keep text crisp.

## What's next for Tabby
- Sending requests from each person's own PayPal account (PayPal partner onboarding) instead of a central sandbox account.
- Group trips with running balances across many bills.
- An India version using direct UPI payment links: Tabby's split engine is payment-agnostic, so the same flow can work with PayPal globally and UPI in India.

## Built with
`next.js` `react` `typescript` `tailwindcss` `gemini` `paypal-invoicing` `paypal-payouts` `paypal-webhooks` `log-in-with-paypal` `ag-grid` `render` `vercel` `upstash-redis` `github-actions` `remotion` `elevenlabs`

## Try it out
- Live demo: https://tabby-eta-five.vercel.app (press **Try the demo**, or log in with a PayPal sandbox account)
- Code: https://github.com/SankeerthNara/Tabby
- Video: _YouTube link_

## Sponsor tools
- **AG Grid:** the review step is an editable AG Grid (one row per receipt line, a column per person, pinned "Each pays" row that re-splits as you type), and My tabs has an AG Grid ledger with sorting, quick search, CSV export and pinned open totals, themed to match Tabby in light and dark mode.
- **Render:** `tabby-worker` on Render receives PayPal "invoice paid" webhooks (signature-verified) and forwards the money with PayPal Payouts, and runs the daily reminder job that nudges friends who haven't paid.
