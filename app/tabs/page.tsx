"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, ViewTransition } from "react";
import { Asterisk, Avatar, TONES } from "../ui";

type Share = {
  name: string;
  email: string;
  invoiceId: string;
  payUrl?: string;
  totalCents: number;
  chargedCents: number;
  chargedCurrency: string;
  status: string;
};
type Split = { id: string; owner: { name: string; email: string }; merchant: string; currency: string; createdAt: number; shares: Share[] };
type Data = { user: { name: string; email: string }; paid: Split[]; owe: Split[] };

const PAID = ["PAID", "MARKED_AS_PAID"];
// Same slide as the home page: forward into My tabs, back out to Split a bill.
const SLIDE = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };
const isPaid = (s: Share) => PAID.includes(s.status);
const isOpen = (s: Share) => !isPaid(s) && s.status !== "CANCELLED";
const money = (cents: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function Amount({ s, currency }: { s: Share; currency: string }) {
  return (
    <span className="text-right">
      <span className="block font-bold tabular-nums">{money(s.chargedCents, s.chargedCurrency)}</span>
      {s.chargedCurrency !== currency && <span className="block text-xs text-muted">{money(s.totalCents, currency)}</span>}
    </span>
  );
}

function StatusPill({ s }: { s: Share }) {
  const [bg, fg, label] = isPaid(s) ? [...TONES[1], "Paid ✓"] : s.status === "CANCELLED" ? [...TONES[7], "Cancelled"] : [...TONES[5], "Waiting"];
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: bg, color: fg }}>
      {label}
    </span>
  );
}

export default function Tabs() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loggedOut, setLoggedOut] = useState(false);
  const [tab, setTab] = useState<"pending" | "settled" | "owe">("pending");
  const [nudged, setNudged] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tabs").catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res?.status === 401) setLoggedOut(true);
    else if (!res?.ok) setError(body.error ?? "Couldn't load your tabs.");
    else {
      setData(body);
      setError("");
    }
    setLoading(false);
  }, []);

  // Load once, and again when you come back to the tab (a friend may have paid meanwhile).
  useEffect(() => {
    const onShow = () => document.visibilityState === "visible" && load();
    const id = requestAnimationFrame(() => load());
    document.addEventListener("visibilitychange", onShow);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [load]);

  const nudge = async (id: string) => {
    setNudged((n) => ({ ...n, [id]: "Nudging…" }));
    const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const body = await res.json().catch(() => ({}));
    setNudged((n) => ({ ...n, [id]: res.ok ? "Nudged ✓" : (body.error ?? "Couldn't nudge") }));
  };

  const pending = data?.paid.filter((s) => s.shares.some(isOpen)) ?? [];
  const settled = data?.paid.filter((s) => !s.shares.some(isOpen)) ?? [];
  const owe = data?.owe ?? [];
  const tabs = [
    ["pending", "Pending", pending.length],
    ["settled", "Settled", settled.length],
    ["owe", "You owe", owe.filter((s) => s.shares.some(isOpen)).length],
  ] as const;
  const list = tab === "pending" ? pending : tab === "settled" ? settled : owe;

  return (
    <ViewTransition enter={SLIDE} exit={SLIDE} default="none">
    <div className="flex flex-1 flex-col">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8" style={{ viewTransitionName: "site-nav" }}>
        <Link href="/" transitionTypes={["nav-back"]} className="flex items-center gap-2 text-xl font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-blue text-white">
            <Asterisk className="size-4" />
          </span>
          Tabby
        </Link>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link href="/#split" transitionTypes={["nav-back"]} className="rounded-full bg-fg px-4 py-2 text-surface hover:bg-blue hover:text-white">
            Split a bill
          </Link>
          {data && (
            <form action="/api/auth/logout" method="post">
              <button className="rounded-full border border-line px-4 py-2 hover:border-fg">Log out</button>
            </form>
          )}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">My tabs</h1>
            {data && <p className="mt-2 text-muted">Logged in as {data.user.name} ({data.user.email})</p>}
          </div>
          {data && (
            <button onClick={load} disabled={loading} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-fg disabled:opacity-50">
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </div>

        {loggedOut ? (
          <div className="mt-10 rounded-[1.75rem] bg-surface p-8 text-center">
            <p className="text-lg font-semibold">Log in to see the bills you&apos;ve split and who still owes you.</p>
            <a href="/api/auth/login?next=/tabs" className="mt-5 inline-block rounded-full bg-blue px-6 py-3 font-semibold text-white hover:brightness-110">
              Log in with PayPal
            </a>
          </div>
        ) : error ? (
          <p role="alert" className="mt-10 rounded-xl bg-[#fde8e8] p-4 font-medium text-[#b91c1c]">
            {error}
          </p>
        ) : !data ? (
          <p role="status" className="mt-10 text-muted motion-safe:animate-pulse">Loading your tabs…</p>
        ) : (
          <>
            <div role="tablist" aria-label="Tabs" className="mt-8 flex gap-2 overflow-x-auto">
              {tabs.map(([key, label, count]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 font-semibold transition ${tab === key ? "bg-blue text-white" : "bg-surface hover:bg-line"}`}
                >
                  {label}
                  <span className={`rounded-full px-2 text-xs leading-5 ${tab === key ? "bg-white/20" : "bg-canvas"}`}>{count}</span>
                </button>
              ))}
            </div>

            <div role="tabpanel" className="mt-6 space-y-4">
              {list.length === 0 && (
                <div className="rounded-[1.75rem] bg-surface p-8 text-center text-muted">
                  {tab === "pending" && "Nobody owes you anything right now."}
                  {tab === "settled" && "Bills where everyone has paid show up here."}
                  {tab === "owe" && "When a friend splits a bill with your PayPal email, it shows up here."}
                  {tab !== "owe" && (
                    <Link href="/#split" transitionTypes={["nav-back"]} className="mt-4 block font-semibold text-blue hover:underline">
                      Split a bill
                    </Link>
                  )}
                </div>
              )}

              {list.map((split) => {
                const paidCount = split.shares.filter(isPaid).length;
                return (
                  <article key={split.id} className="rounded-[1.75rem] bg-surface p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-xl font-bold">{split.merchant || "A bill"}</h2>
                      <p className="text-sm text-muted">
                        {tab === "owe" ? `${split.owner.name} paid, ${day(split.createdAt)}` : `${day(split.createdAt)}, ${paidCount} of ${split.shares.length} paid`}
                      </p>
                    </div>
                    {tab !== "owe" && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
                        <div className="h-full rounded-full bg-mint" style={{ width: `${(paidCount / split.shares.length) * 100}%` }} />
                      </div>
                    )}
                    <ul className="mt-4 divide-y divide-line">
                      {split.shares.map((s, i) => (
                        <li key={s.invoiceId} className="flex flex-wrap items-center gap-3 py-3">
                          <Avatar name={tab === "owe" ? split.owner.name : s.name} tone={TONES[(i + 1) % TONES.length]} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{tab === "owe" ? `You owe ${split.owner.name}` : s.name}</p>
                            <p className="truncate text-xs text-muted">{tab === "owe" ? split.owner.email : s.email}</p>
                          </div>
                          <Amount s={s} currency={split.currency} />
                          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                            <StatusPill s={s} />
                            {isOpen(s) && tab === "owe" && s.payUrl && (
                              <a href={s.payUrl} target="_blank" rel="noreferrer" className="rounded-full bg-blue px-3 py-1 text-xs font-semibold text-white hover:brightness-110">
                                Pay
                              </a>
                            )}
                            {isOpen(s) && tab !== "owe" && (
                              <button
                                onClick={() => nudge(s.invoiceId)}
                                disabled={!!nudged[s.invoiceId] && nudged[s.invoiceId] !== "Couldn't nudge"}
                                className="rounded-full border border-line px-3 py-1 text-xs font-semibold hover:border-fg disabled:opacity-60"
                              >
                                {nudged[s.invoiceId] ?? "Nudge"}
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
            <p className="mt-8 text-xs text-muted">
              Sandbox demo: requests are sent from Tabby&apos;s PayPal account. Routing money to each person&apos;s own PayPal needs PayPal&apos;s partner program.
            </p>
          </>
        )}
      </main>
    </div>
    </ViewTransition>
  );
}
