import { randomUUID } from "node:crypto";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { deleteFriend, deleteGroup, friendsAndGroups, saveFriends, saveGroup } from "@/lib/store";

const Person = z.object({ name: z.string().trim().min(1).max(40), email: z.string().trim().email() });
// One route for the Friends tab and the split card: list, save/delete a friend, save/delete a group.
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("saveFriend"), friend: Person, previousEmail: z.string().email().optional() }),
  z.object({ action: z.literal("deleteFriend"), email: z.string().email() }),
  z.object({
    action: z.literal("saveGroup"),
    group: z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(40), members: z.array(Person).min(1).max(19) }),
  }),
  z.object({ action: z.literal("deleteGroup"), id: z.string().uuid() }),
]);

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in with PayPal to see your friends." }, { status: 401 });
  try {
    return Response.json(await friendsAndGroups(user));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in with PayPal first." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the names and emails." }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "saveFriend") {
      // editing an email: drop the old entry so the friend isn't listed twice
      if (b.previousEmail && b.previousEmail.toLowerCase() !== b.friend.email.toLowerCase()) await deleteFriend(user, b.previousEmail);
      await saveFriends(user, [b.friend]);
    } else if (b.action === "deleteFriend") {
      await deleteFriend(user, b.email);
    } else if (b.action === "saveGroup") {
      const seen = new Set<string>();
      const members = b.group.members.filter((m) => !seen.has(m.email.toLowerCase()) && seen.add(m.email.toLowerCase()));
      await saveGroup(user, { id: b.group.id ?? randomUUID(), name: b.group.name, members });
    } else {
      await deleteGroup(user, b.id);
    }
    return Response.json(await friendsAndGroups(user));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
