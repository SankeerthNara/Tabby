import { ApiError, GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";
import type { Receipt } from "./split";

// 60s cap so a slow free-tier response fails visibly instead of hanging the UI.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 60_000 } });
// Free-tier models get overloaded (503) or rate-limited (429); fall through to the next one.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

// One JSON-mode call; zod re-validates because the model output is untrusted.
async function ask<T extends z.ZodType>(schema: T, parts: Part[]): Promise<z.infer<T>> {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema); // eslint-disable-line @typescript-eslint/no-unused-vars
  let last: unknown;
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
      // Bad request or bad key won't get better on another model.
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 429) throw new Error(`Gemini error ${e.status}: ${e.message}`);
    }
  }
  if (last instanceof ApiError && last.status === 429) throw new Error("Gemini free-tier rate limit hit. Wait a minute and try again.");
  if (last instanceof ApiError) throw new Error("Gemini is busy right now. Try again in a minute.");
  throw new Error("The AI was too slow or gave an unreadable answer. Try again.");
}

const ReceiptSchema = z.object({
  merchant: z.string(),
  currency: z.string().describe("ISO 4217 code, e.g. USD"),
  items: z.array(z.object({ name: z.string(), price: z.number().describe("line total = quantity x unit price") })),
  tax: z.number(),
  tip: z.number().describe("tip, gratuity or service charge printed on the receipt, else 0"),
  total: z.number().describe("final amount due"),
});

export function readReceipt(base64: string, mimeType: string): Promise<Receipt> {
  return ask(ReceiptSchema, [
    { inlineData: { mimeType, data: base64 } },
    {
      text: "Extract every purchased line item from this receipt. Use short readable item names. Discounts are items with a negative price. Do not list subtotal, tax, tip or total as items. If this is not a receipt, return no items.",
    },
  ]);
}

export function assignItems(receipt: Receipt, names: string[], payer: string, sentence: string) {
  const Who = z.enum(names as [string, ...string[]]);
  const schema = z.object({
    assignments: z.array(z.object({ item: z.number().int(), people: z.array(Who) })),
    extra_tip_percent: z.number().describe("tip percent the user asked to add on top, else 0"),
    question: z.string().describe("one short clarifying question if something is genuinely ambiguous, else empty"),
  });
  const items = receipt.items.map((it, i) => `${i}. ${it.name} - ${it.price}`).join("\n");
  return ask(schema, [
    {
      text: `Receipt items:\n${items}\n\nPeople: ${names.join(", ")}. "I", "me" or "my" means ${payer}.\n\nWho had what, in their words:\n"""${sentence}"""\n\nFor every item index, list the people who shared it. Items nobody mentioned, or said to be shared by everyone, get all people.`,
    },
  ]);
}
