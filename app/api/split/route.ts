import { z } from "zod";
import { assignItems } from "@/lib/ai";
import { splitBill } from "@/lib/split";

const Body = z.object({
  receipt: z.object({
    merchant: z.string(),
    currency: z.string(),
    items: z.array(z.object({ name: z.string(), price: z.number() })).min(1).max(200),
    tax: z.number(),
    tip: z.number(),
    total: z.number(),
  }),
  // people[0] is the payer and gets no invoice
  people: z.array(z.object({ name: z.string().trim().min(1).max(40), email: z.string() })).min(2).max(20),
  sentence: z.string().trim().min(1).max(2000),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Add a receipt, at least one friend, and who had what." }, { status: 400 });
  const { receipt, people, sentence } = parsed.data;
  const names = people.map((p) => p.name);
  if (new Set(names).size !== names.length) return Response.json({ error: "Give everyone a different name." }, { status: 400 });

  try {
    const ai = await assignItems(receipt, names, names[0], sentence);
    const assignments = receipt.items.map((_, i) => ai.assignments.find((a) => a.item === i)?.people ?? []);
    return Response.json({ shares: splitBill(receipt, assignments, people, ai.extra_tip_percent), assignments, question: ai.question });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
