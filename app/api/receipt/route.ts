import { readReceipt } from "@/lib/ai";
import { guardAi } from "@/lib/auth";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export async function POST(req: Request) {
  const blocked = await guardAi(req);
  if (blocked) return blocked;
  const file = (await req.formData()).get("receipt");
  if (!(file instanceof File)) return Response.json({ error: "No receipt image uploaded." }, { status: 400 });
  const type = TYPES.find((t) => t === file.type);
  if (!type) return Response.json({ error: "Upload a JPEG, PNG, WebP or GIF image." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Image is over 5 MB." }, { status: 400 });

  try {
    const receipt = await readReceipt(Buffer.from(await file.arrayBuffer()).toString("base64"), type);
    if (!receipt.items.length) return Response.json({ error: "Couldn't find any items. Is that a receipt?" }, { status: 422 });
    return Response.json(receipt);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
