# Tabby 🐱 — the AI that settles the tab

Snap a receipt, say who had what. Tabby's AI splits the bill and sends everyone a PayPal request, then nudges whoever hasn't paid.

## How it works

1. **Snap** — Gemini (vision) reads the receipt into line items, tax, tip and total.
2. **Say** — "I had the burger, Sam and Priya split the nachos, add 18% tip." Gemini maps that to items (answers are schema-validated, so it can't invent people) and asks if something is ambiguous.
3. **Split** — plain code does the money in integer cents: shared lines split by how many units each person had (1 of "3 x Biryani" = 1/3), tax/tip/fees spread in proportion to what each person ordered, rounding by largest remainder so shares always equal the receipt total.
4. **Send** — one itemized PayPal invoice per friend (Invoicing API v2).
5. **Settle** — live paid/unpaid board polls PayPal; "Nudge" sends a PayPal reminder.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                  # http://localhost:3000
npm test                     # split math tests
```

Keys:
- `GEMINI_API_KEY` — aistudio.google.com → Get API key (free tier)
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` — developer.paypal.com → Apps & Credentials (Sandbox)

For the demo, create 2–3 sandbox **Personal** accounts (Testing Tools → Sandbox Accounts) and use their emails as the friends. Log into sandbox.paypal.com as one of them to pay and watch the board flip to "Paid ✓".

## Stack

Next.js · TypeScript · Tailwind · Gemini (`@google/genai`, JSON-schema output) · PayPal Invoicing API v2 (sandbox)

| File | What |
|---|---|
| `lib/split.ts` | money math (tested in `lib/split.test.ts`) |
| `lib/ai.ts` | receipt reading + "who had what" |
| `lib/paypal.ts` | OAuth, create/send invoice, status, remind |
| `app/api/*` | receipt, split, send, invoices routes |
| `app/page.tsx` | the whole UI |
