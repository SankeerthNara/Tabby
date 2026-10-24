import { ApiError, GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";
import type { Receipt } from "./split";

// 60s cap so a slow free-tier response fails visibly instead of hanging the UI.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 60_000 } });
// Free-tier models get overloaded (503) or rate-limited (429); fall through to the next one.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

// Next in line once every Gemini model is busy or out of quota: Cloudflare Workers AI
// (separate free daily allowance, runs on GPUs). Uses its OpenAI-compatible endpoint.
const CF_MODELS = ["@cf/meta/llama-4-scout-17b-16e-instruct", "@cf/mistralai/mistral-small-3.1-24b-instruct"];

async function askCloudflare(model: string, jsonSchema: object, parts: Part[]): Promise<unknown> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_schema", json_schema: { name: "answer", schema: jsonSchema } },
      messages: [
        {
          role: "user",
          content: parts.map((p) =>
            p.inlineData ? { type: "image_url", image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } } : { type: "text", text: p.text ?? "" },
          ),
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Cloudflare ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return JSON.parse((await res.json()).choices[0].message.content);
}

// One JSON-mode call; zod re-validates because the model output is untrusted.
async function ask<T extends z.ZodType>(schema: T, parts: Part[]): Promise<z.infer<T>> {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema); // eslint-disable-line @typescript-eslint/no-unused-vars
  let last: unknown;
  let fatal: unknown; // bad request or bad key: skip the other Gemini models, go straight to Cloudflare
  for (const model of MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: { responseMimeType: "application/json", responseJsonSchema: jsonSchema },
      });
      return schema.parse(JSON.parse(res.text ?? ""));
    } catch (e) {
      last = e;
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429) {
        fatal = e;
        break;
      }
    }
  }
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    for (const model of CF_MODELS) {
      try {
        return schema.parse(await askCloudflare(model, jsonSchema, parts));
      } catch (e) {
        console.error(`Cloudflare ${model} failed:`, e);
      }
    }
    throw new Error("Every AI model is busy or out of free quota right now. Try again in a minute.");
  }
  if (fatal instanceof ApiError) throw new Error(`Gemini error ${fatal.status}: ${fatal.message}`);
  if (last instanceof ApiError && last.status === 429) throw new Error("Gemini free-tier rate limit hit. Wait a minute and try again.");
  if (last instanceof ApiError) throw new Error("Gemini is busy right now. Try again in a minute.");
  throw new Error("The AI was too slow or gave an unreadable answer. Try again.");
}

const ReceiptSchema = z.object({
  merchant: z.string(),
  currency: z.string().describe("ISO 4217 code, e.g. USD"),
  items: z.array(
    z.object({
      quantity: z.number().int().nullable().describe("quantity printed on the line, e.g. 2 for '2 x Hakka Noodles'; null if none is printed"),
      name: z.string().describe("item name without the quantity"),
      price: z.number().describe("line total = quantity x unit price"),
    }),
  ),
  tax: z.number(),
  tip: z.number().describe("tip, gratuity or service charge printed on the receipt, else 0"),
  total: z.number().describe("final amount due"),
});

// Fallback models sometimes answer "₹" instead of "INR"; the UI and USD conversion need the ISO code.
const SYMBOLS: Record<string, string> = { "₹": "INR", Rs: "INR", "Rs.": "INR", $: "USD", "€": "EUR", "£": "GBP", "¥": "JPY" };
function toIsoCurrency(c: string) {
  const code = (SYMBOLS[c.trim()] ?? c).trim().toUpperCase();
  // shortcut: unknown symbols become USD, upgrade if receipts in other symbol-only currencies show up
  return /^[A-Z]{3}$/.test(code) ? code : "USD";
}

export async function readReceipt(base64: string, mimeType: string): Promise<Receipt> {
  const r = await ask(ReceiptSchema, [
    { inlineData: { mimeType, data: base64 } },
    {
      text: "Extract every purchased line item from this receipt, with the quantity printed on each line. Discounts are items with a negative price. Do not list subtotal, tax, tip or total as items. If this is not a receipt, return no items.",
    },
  ]);
  // Quantity stays in the name, so it shows in the UI, guides "I had 1 of the 2 dosas", and lands on the invoice.
  return {
    ...r,
    currency: toIsoCurrency(r.currency),
    items: r.items.map(({ quantity, name, price }) => ({ name: quantity ? `${quantity} x ${name}` : name, price })),
  };
}

export function assignItems(receipt: Receipt, names: string[], payer: string, sentence: string) {
  const Who = z.enum(names as [string, ...string[]]);
  const schema = z.object({
    assignments: z.array(
      z.object({
        item: z.number().int(),
        people: z.array(z.object({ name: Who, units: z.number().describe("how many of this line the person had; use equal numbers for an evenly shared item") })),
      }),
    ),
    extra_tip_percent: z.number().describe("tip percent the user asked to add on top, else 0"),
    question: z.string().describe("one short clarifying question if something is genuinely ambiguous, else empty"),
    not_on_receipt: z.array(z.string()).describe("foods or drinks they say someone had that match no receipt item, in their words; else empty"),
  });
  const items = receipt.items.map((it, i) => `${i}. ${it.name} - ${it.price}`).join("\n");
  return ask(schema, [
    {
      text: `Receipt items:\n${items}\n\nPeople: ${names.join(", ")}. "I", "me" or "my" means ${payer}.\n\nWho had what, in their words:\n"""${sentence}"""\n\nFor every item index, list who had it and how many units each. Example: on "3 x Veg Biryani", "I had 1 biryani, Sam the rest" gives Me 1 and Sam 2. An item shared evenly gives each sharer 1. Items nobody mentioned, or said to be shared by everyone, get all people with 1 each. Set "question" to an empty string unless something is genuinely ambiguous. List in "not_on_receipt" every food or drink they mention that matches no receipt item (e.g. "dosa" when the receipt only has pizza and burger). Short names, nicknames, spelling slips and other languages for a receipt item still match; only list what is clearly not on it.`,
    },
  ]);
}
