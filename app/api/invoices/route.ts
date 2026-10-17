import { invoiceStatus, remind } from "@/lib/paypal";

const ID = /^[A-Z0-9-]{1,64}$/;

export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter((id) => ID.test(id)).slice(0, 20);
  const results = await Promise.allSettled(ids.map(invoiceStatus));
  return Response.json(results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])));
}

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || !ID.test(id)) return Response.json({ error: "Bad invoice id." }, { status: 400 });
  try {
    await remind(id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
