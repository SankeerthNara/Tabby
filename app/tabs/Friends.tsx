"use client";

import { useEffect, useState } from "react";
import type { Friend, Group } from "@/lib/store";
import { Asterisk, Avatar, TONES } from "../ui";

type Person = { name: string; email: string };
const EMAIL = /^\S+@\S+\.\S+$/;
const field =
  "w-full rounded-xl bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
const pill = "rounded-full border border-line px-3 py-1 text-xs font-semibold hover:border-fg disabled:opacity-50";

// "Friends" tab: saved friends (added automatically when you send requests) and groups you can seat in one tap.
export default function Friends({ onCount }: { onCount: (n: number) => void }) {
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ email: string; draft: Person } | null>(null); // friend being edited
  const [adding, setAdding] = useState<Person>({ name: "", email: "" });
  const [group, setGroup] = useState<{ id?: string; name: string; emails: string[] } | null>(null); // group editor
  const [busy, setBusy] = useState(false);

  const apply = (d: { friends: Friend[]; groups: Group[] }) => {
    setFriends(d.friends);
    setGroups(d.groups);
    onCount(d.friends.length);
  };
  useEffect(() => {
    fetch("/api/friends")
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) apply(d);
        else setError(d.error ?? "Couldn't load your friends.");
      })
      .catch(() => setError("Couldn't load your friends."));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when the tab opens
  }, []);

  const act = async (body: object) => {
    setBusy(true);
    setError("");
    const r = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setError(d.error ?? "Something went wrong.");
      return false;
    }
    apply(d);
    return true;
  };

  if (!friends) {
    return error ? (
      <p role="alert" className="rounded-xl bg-[#fde8e8] p-4 font-medium text-[#b91c1c]">{error}</p>
    ) : (
      <div className="h-40 rounded-[1.75rem] bg-surface motion-safe:animate-pulse" />
    );
  }

  const nameOf = (email: string) => friends.find((f) => f.email === email)?.name ?? email;
  const saveGroup = async () => {
    if (!group) return;
    const members = group.emails.map((e) => ({ name: nameOf(e), email: e }));
    if (!group.name.trim() || !members.length) return setError("Give the group a name and pick at least one friend.");
    if (await act({ action: "saveGroup", group: { id: group.id, name: group.name, members } })) setGroup(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {error && (
        <p role="alert" className="rounded-xl bg-[#fde8e8] p-4 font-medium text-[#b91c1c] lg:col-span-2">
          {error}
        </p>
      )}

      <section className="rounded-[1.75rem] bg-surface p-6" aria-label="Saved friends">
        <h2 className="text-xl font-bold">Saved friends</h2>
        <p className="mt-1 text-sm text-muted">Everyone you send a request to is saved here automatically.</p>
        {friends.length === 0 ? (
          <div className="py-8 text-center">
            <Asterisk className="mx-auto size-10 text-blue" delay={200} />
            <p className="mt-3 text-sm text-muted">No saved friends yet. Add one below or send your first split.</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {friends.map((f, i) =>
              editing?.email === f.email ? (
                <li key={f.email} className="grid gap-2 py-3">
                  <input className={field} aria-label="Friend name" value={editing.draft.name} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })} />
                  <input className={field} type="email" aria-label="Friend PayPal email" value={editing.draft.email} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, email: e.target.value } })} />
                  <div className="flex gap-2">
                    <button
                      className="rounded-full bg-blue px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={busy || !editing.draft.name.trim() || !EMAIL.test(editing.draft.email)}
                      onClick={async () => (await act({ action: "saveFriend", friend: editing.draft, previousEmail: f.email })) && setEditing(null)}
                    >
                      Save
                    </button>
                    <button className={pill} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </li>
              ) : (
                <li key={f.email} className="flex items-center gap-3 py-3">
                  <Avatar name={f.name} tone={TONES[(i + 1) % TONES.length]} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{f.name}</p>
                    <p className="truncate text-xs text-muted">{f.email}</p>
                  </div>
                  <button className={pill} onClick={() => setEditing({ email: f.email, draft: { name: f.name, email: f.email } })}>Edit</button>
                  <button className={pill} disabled={busy} onClick={() => act({ action: "deleteFriend", email: f.email })} aria-label={`Delete ${f.name}`}>
                    Delete
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
        <form
          className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_1.4fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await act({ action: "saveFriend", friend: adding })) setAdding({ name: "", email: "" });
          }}
        >
          <input className={field} placeholder="Name" aria-label="New friend name" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
          <input className={field} type="email" placeholder="PayPal email" aria-label="New friend PayPal email" value={adding.email} onChange={(e) => setAdding({ ...adding, email: e.target.value })} />
          <button className="rounded-full bg-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || !adding.name.trim() || !EMAIL.test(adding.email)}>
            Add
          </button>
        </form>
      </section>

      <section className="rounded-[1.75rem] bg-surface p-6" aria-label="Groups">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Groups</h2>
            <p className="mt-1 text-sm text-muted">Pick a group when splitting and everyone in it is seated at once.</p>
          </div>
          {!group && friends.length > 0 && (
            <button className="shrink-0 rounded-full bg-blue px-4 py-2 text-sm font-semibold text-white" onClick={() => setGroup({ name: "", emails: [] })}>
              New group
            </button>
          )}
        </div>

        {group && (
          <div className="mt-4 rounded-2xl bg-canvas p-4">
            <input className={`${field} bg-surface`} autoFocus placeholder="Group name, like Goa trip" aria-label="Group name" value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} />
            <fieldset className="mt-3">
              <legend className="text-xs font-semibold text-muted">Who&apos;s in it?</legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {friends.map((f) => {
                  const on = group.emails.includes(f.email);
                  return (
                    <label key={f.email} className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${on ? "bg-blue text-white" : "bg-surface hover:bg-line"}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() => setGroup({ ...group, emails: on ? group.emails.filter((e) => e !== f.email) : [...group.emails, f.email] })}
                      />
                      {on ? "✓ " : "+ "}
                      {f.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-4 flex gap-2">
              <button className="rounded-full bg-blue px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={saveGroup}>
                Save group
              </button>
              <button className={pill} onClick={() => setGroup(null)}>Cancel</button>
            </div>
          </div>
        )}

        {groups.length === 0 && !group ? (
          <div className="py-8 text-center">
            <Asterisk className="mx-auto size-10 text-mint" delay={300} />
            <p className="mt-3 text-sm text-muted">
              {friends.length ? "No groups yet. Make one for your trip crew or flatmates." : "Save a few friends first, then group them."}
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {groups.map((g) => (
              <li key={g.id} className="rounded-2xl border border-line p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{g.name}</p>
                  <div className="flex gap-1.5">
                    <button className={pill} onClick={() => setGroup({ id: g.id, name: g.name, emails: g.members.map((m) => m.email) })}>Edit</button>
                    <button className={pill} disabled={busy} onClick={() => act({ action: "deleteGroup", id: g.id })} aria-label={`Delete group ${g.name}`}>
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex -space-x-2">
                  {g.members.slice(0, 8).map((m, i) => (
                    <Avatar key={m.email} name={m.name} tone={TONES[(i + 1) % TONES.length]} size="size-8" />
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">{g.members.map((m) => m.name).join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
