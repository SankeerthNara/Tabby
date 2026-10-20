# Tabby — demo video script

**Length:** 1:57 · **Format:** 1920×1080, 30 fps · **Upload:** YouTube (public, as the rules require) → Devpost
**Story:** one dinner in San Francisco — Harbor & Pine Kitchen, $79.57 before tip — followed from the receipt to the money landing back in the payer's PayPal. You (Sankeerth) paid; your friends are John Doe and Priya (the "Dinner crew" group).
**Voices:** narrator Sumeet (ElevenLabs, Indian English); you speaking into the app: Kaanha.

| Item | Qty | Who had it |
|---|---|---|
| Classic Cheeseburger | 1 | You |
| Fish Tacos | 3 | John 2, Priya 1 |
| Truffle Fries | 2 | Shared (then Priya removed in the review step) |
| Caesar Salad | 1 | Priya |
| Mango Lemonade | 2 | You 1, Priya 1 → corrected by voice to John |
| Craft Root Beer | 1 | John |

---

## Scenes

1. **Cold open (animated)** — receipt prints; chat: John *"who had the tacos??"*, John *"wait, did we tip?"*, Priya *"I'll pay you later 🙏"*.
   > Dinner's over. The bill lands. And suddenly, nobody remembers who had what — or when they'll pay you back.
2. **Title (animated)** — Snap it. Say it. Settled.
   > This is Tabby. Snap the receipt, say who had what, and everyone gets a PayPal request.
3. **Log in with PayPal** (live site → PayPal sandbox sign-in)
   > You sign in with PayPal — no new password.
4. **Snap** — upload; Gemini lists every line with quantities, tax and total.
   > Take a photo. Gemini reads every line: quantities, tax and the total.
5. **Type it** — Select a group → Dinner crew; type: *"I had the cheeseburger and a mango lemonade. Of the 3 fish tacos, John had 2 and Priya had 1. Priya had the Caesar salad and the other lemonade. John had the root beer. We shared the fries. Add 18% tip."* → Split.
   > Pick your friends, or a saved group, and type who had what. Two of three tacos? Tabby splits it by quantity, adds the tip, and shares the tax fairly, to the cent.
6. **Say it** — tap Say it; you: *"Oh wait, John had one of the lemonades, not Priya. And make the tip twenty percent."* → words fill in → Split again → lemonade chip moves to John, tip 20%.
   > Rather talk? Just tap Say it. … Tabby even understands corrections.
7. **Fix it** — the AG Grid review table: tap Priya's cell on the Truffle Fries line, type 0, and the "Each pays" row re-splits.
   > If the AI misreads anything, fix it in a tap. The math updates instantly.
8. **Send** — Send PayPal requests → Waiting → cut to Priya's real itemized PayPal invoice.
   > Send, and every friend gets an itemized PayPal invoice, with every line, plus their share of tax and tip.
9. **Paid → forwarded** — John's line flips to Paid ✓ and "Forwarded to your PayPal ✓".
   > When a friend pays, Tabby sees it — and forwards the money straight to whoever covered the bill, with PayPal Payouts.
10. **My tabs** — summary, tab switching, Nudge, then the AG Grid Ledger (totals, search for "Priya", Export CSV), Friends, dark mode.
    > My Tabs keeps score: who owes you, what you owe, and a nudge for anyone who's slow to pay.
11. **Under the hood (animated)** — Photo + words → Gemini → the math → PayPal (Log in with PayPal · Invoicing · Reminders · Payouts · Any currency), plus "Built with: AG Grid (review grid + ledger) · Render (webhooks + daily reminders)".
    > Under the hood, Gemini understands the receipt and your words, plain code does the money, and PayPal does the rest: login, invoices, reminders and payouts.
12. **Outro (animated)**
    > Tabby. Snap it. Say it. Settled.

---

## What's staged for the camera
- **Say it:** browser speech recognition can't run in an automated recording, so a recording-only stand-in fed the spoken words to the real app in sync with a generated voice clip. The AI re-split after it is real.
- **John's payment:** recorded via the PayPal API plus a finished payout record; the real pay → payout flow was verified separately in the sandbox.
- **Login page artwork:** the illustration card's "Blueleaf Bistro / Vattesh" text was swapped to "Harbor & Pine Kitchen / John Doe" in the recording only.

## How it's made
- Footage: a Playwright script (kept outside the repo) recording the local production build with Chrome's screencast at 2880×1620; clips go in `public/footage/` (gitignored). The Ledger is a separate short clip so the whole grid is in view.
- Edit: Remotion project in this folder (`npx remotion studio`, `npx remotion render TabbyDemo`).
- Audio: ElevenLabs voices and music (the 110 s bed plays slightly slower so it ends on the outro); sound effects from remotion.media.
- Text in the animated scenes uses the site's Archivo font files with their unicode ranges, so parallel render tabs draw identical frames.
