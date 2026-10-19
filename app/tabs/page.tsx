"use client";

import Link from "next/link";
import { addTransitionType, startTransition, useCallback, useEffect, useState, ViewTransition } from "react";
import { Asterisk, Avatar, CountUp, Scribble, ThemeToggle, TONES, Words, d, payoutText } from "../ui";
import Friends from "./Friends";
import Ledger, { type LedgerRow } from "./Ledger";

type Share = {
  name: string;
  email: string;
  invoiceId: string;
  payUrl?: string;
  totalCents: number;
  chargedCents: number;
  chargedCurrency: string;
  status: string;
  payout?: { status: string; to: string; error?: string }; // money forwarded to whoever paid the bill
};
type Split = { id: string; owner: { name: string; email: string }; payer?: { name: string; email: string }; merchant: string; currency: string; createdAt: number; shares: Share[] };
type Data = { user: { name: string; email: string }; paid: Split[]; owe: Split[] };

const PAID = ["PAID", "MARKED_AS_PAID"];
// Same slide as the home page: forward into My tabs, back out to Split a bill.
type Tab = "pending" | "settled" | "owe" | "ledger" | "friends";
const TAB_ORDER: Tab[] = ["pending", "settled", "owe", "ledger", "friends"];
const TAB_SLIDE = { "tab-forward": "tab-forward", "tab-back": "tab-back", default: "none" };
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

// Totals per currency (PayPal requests can be in USD even when the receipt was in INR).
const sumBy = (shares: Share[]) =>
  [...shares.reduce((m, s) => m.set(s.chargedCurrency, (m.get(s.chargedCurrency) ?? 0) + s.chargedCents), new Map<string, number>())];
const waited = (from: number, now: number) => {
  const days = Math.floor((now - from) / 86_400_000);
  return days <= 0 ? "Waiting since today" : `Waiting ${days} day${days === 1 ? "" : "s"}`;
};

function Totals({ shares, delay }: { shares: Share[]; delay: number }) {
  const sums = sumBy(shares);
  if (!sums.length) return <>{money(0, "USD")}</>;
  return sums.map(([cur, cents], i) => (
    <span key={cur}>
      {i > 0 && " + "}
      <CountUp value={cents} format={(v) => money(v, cur)} delay={delay} />
    </span>
  ));
}

// Summary across every saved split: what's owed to you, what you owe, and how much has come back.
function Summary({ data, onOwe }: { data: Data; onOwe: () => void }) {
  const requested = data.paid.flatMap((sp) => sp.shares.filter((s) => s.status !== "CANCELLED"));
  const open = requested.filter(isOpen);
  const collected = requested.filter(isPaid);
  const iOwe = data.owe.flatMap((sp) => sp.shares.filter(isOpen));
  const pct = requested.length ? collected.length / requested.length : 0;
  const debtors = [...new Set(open.map((s) => s.name))];
  const openBills = data.paid.filter((sp) => sp.shares.some(isOpen)).length;

  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-3">
      <section className="relative overflow-hidden rounded-[2rem] p-7 text-white lg:col-span-2" aria-label="Owed to you">
        <div aria-hidden className="a a-wipe absolute inset-0 rounded-[2rem] bg-blue" style={d(0)} />
        <Asterisk className="absolute right-6 top-6 size-12 text-mint sm:size-16" delay={500} />
        <Scribble className="absolute -bottom-6 right-40 hidden w-40 text-white/50 sm:block" delay={800} />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="a a-up text-sm font-semibold text-white/80" style={d(250)}>You&apos;re owed</p>
            <p className="a a-up display mt-2 text-[clamp(2.2rem,5vw,3.5rem)]" style={d(320)}>
              <Totals shares={open} delay={400} />
            </p>
            <p className="a a-up mt-2 text-white/80" style={d(420)}>
              {open.length
                ? `from ${debtors.length} ${debtors.length === 1 ? "person" : "people"} across ${openBills} ${openBills === 1 ? "bill" : "bills"}`
                : "Nobody owes you anything right now."}
            </p>
            {debtors.length > 0 && (
              <div className="mt-5 flex -space-x-2">
                {debtors.slice(0, 5).map((n, i) => (
                  <Avatar key={n} name={n} tone={TONES[(i + 1) % TONES.length]} className="a a-pop" style={d(550 + i * 80)} />
                ))}
                {debtors.length > 5 && (
                  <span className="a a-pop grid size-9 place-items-center rounded-full bg-white/20 text-xs font-bold ring-2 ring-white/40" style={d(950)}>
                    +{debtors.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Ring draws itself up to the share of requests that have been paid. */}
          <div
            className="a a-ring grid size-36 shrink-0 place-items-center rounded-full sm:mr-16"
            style={d(500, { background: `conic-gradient(var(--mint) 0 ${pct * 100}%, rgb(255 255 255 / 0.18) 0)` })}
          >
            <div className="grid size-[7.25rem] place-items-center rounded-full bg-blue text-center">
              <div>
                <p className="text-3xl font-bold tabular-nums">
                  <CountUp value={Math.round(pct * 100)} format={(v) => `${v}%`} delay={600} />
                </p>
                <p className="text-xs text-white/80">collected</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        <button onClick={onOwe} className="a a-up rounded-[1.75rem] bg-surface p-6 text-left transition hover:-translate-y-0.5" style={d(200)}>
          <p className="text-sm font-semibold text-muted">You owe</p>
          <p className="mt-1 text-2xl font-bold">
            <Totals shares={iOwe} delay={450} />
          </p>
          <p className="mt-1 text-sm text-muted">{iOwe.length ? `${iOwe.length} request${iOwe.length === 1 ? "" : "s"} waiting for you` : "You're all square."}</p>
        </button>
        <div className="a a-up rounded-[1.75rem] bg-surface p-6" style={d(300)}>
          <p className="text-sm font-semibold text-muted">Collected</p>
          <p className="mt-1 text-2xl font-bold">
            <Totals shares={collected} delay={550} />
          </p>
          <p className="mt-1 text-sm text-muted">
            {collected.length} of {requested.length} payments in
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
            <div className="a a-grow h-full origin-left rounded-full bg-mint" style={d(650, { width: `${pct * 100}%` })} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-label="Loading your tabs" className="mt-8 space-y-4 motion-safe:animate-pulse">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-56 rounded-[2rem] bg-blue/25 lg:col-span-2" />
        <div className="grid gap-4">
          <div className="h-[6.5rem] rounded-[1.75rem] bg-surface" />
          <div className="h-[6.5rem] rounded-[1.75rem] bg-surface" />
        </div>
      </div>
      <div className="h-11 w-80 max-w-full rounded-full bg-surface" />
      <div className="h-40 rounded-[1.75rem] bg-surface" />
    </div>
  );
}

export default function Tabs() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loggedOut, setLoggedOut] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  // A transition (not a plain setState) so <ViewTransition> animates; the type says which way to slide.
  const switchTab = (next: Tab) =>
    next !== tab &&
    startTransition(() => {
      addTransitionType(TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? "tab-forward" : "tab-back");
      setTab(next);
      setSwitched(true);
    });
  const [nudged, setNudged] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [friendCount, setFriendCount] = useState(0);
  const [now, setNow] = useState(0); // when data loaded, for "Waiting 3 days"
  const [played, setPlayed] = useState(false);
  const [switched, setSwitched] = useState(false); // cards only rise in on first load; tab switches slide instead
  useEffect(() => {
    const id = requestAnimationFrame(() => setPlayed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    fetch("/api/friends")
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => f && setFriendCount(f.friends.length))
      .catch(() => {});
    const res = await fetch("/api/tabs").catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res?.status === 401) setLoggedOut(true);
    else if (!res?.ok) setError(body.error ?? "Couldn't load your tabs.");
    else {
      setData(body);
      setNow(Date.now());
      setError("");
    }
    setLoading(false);
  }, [setLoading, setNow, setFriendCount]);

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
  // Every share as one ledger row: what friends owe you on bills you paid, and what you owe on theirs.
  const status = (s: Share): LedgerRow["status"] => (isPaid(s) ? "Paid" : s.status === "CANCELLED" ? "Cancelled" : "Waiting");
  const ledger: LedgerRow[] = [
    ...(data?.paid ?? []).flatMap((sp) =>
      sp.shares.map((s) => ({ date: sp.createdAt, bill: sp.merchant || "A bill", person: s.name, email: s.email, direction: "Owes you" as const, cents: s.chargedCents, currency: s.chargedCurrency, status: status(s), payout: s.payout ? payoutText(s.payout, data?.user.email).text.replace(" to your PayPal", "") : "" })),
    ),
    ...owe.flatMap((sp) =>
      sp.shares.map((s) => ({ date: sp.createdAt, bill: sp.merchant || "A bill", person: (sp.payer ?? sp.owner).name, email: (sp.payer ?? sp.owner).email, direction: "You owe" as const, cents: s.chargedCents, currency: s.chargedCurrency, status: status(s), payout: "" })),
    ),
  ];
  const tabs = [
    ["pending", "Pending", pending.length],
    ["settled", "Settled", settled.length],
    ["owe", "You owe", owe.filter((s) => s.shares.some(isOpen)).length],
    ["ledger", "Ledger", ledger.length],
    ["friends", "Friends", friendCount],
  ] as const;
  const list = tab === "pending" ? pending : tab === "settled" ? settled : tab === "owe" ? owe : [];

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
          <ThemeToggle />
          {data && (
            <form action="/api/auth/logout" method="post">
              <button className="rounded-full border border-line px-4 py-2 hover:border-fg">Log out</button>
            </form>
          )}
        </div>
      </nav>

      <main className={`mx-auto w-full max-w-5xl px-5 pb-24 pt-6 sm:px-8 ${played ? "play" : ""}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[clamp(2.5rem,6vw,4.5rem)]">
              <Words lines={["My tabs"]} />
            </h1>
            {data && (
              <p className="a a-up mt-2 text-muted" style={d(150)}>
                Logged in as {data.user.name} ({data.user.email})
              </p>
            )}
          </div>
          {data && (
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-fg disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className={`size-4 ${loading ? "motion-safe:animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" />
              </svg>
              {loading ? "Refreshing" : "Refresh"}
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
          <Skeleton />
        ) : (
          <>
            <Summary data={data} onOwe={() => switchTab("owe")} />
            <div role="tablist" aria-label="Tabs" className={`mt-10 flex gap-2 overflow-x-auto ${switched ? "" : "a a-up"}`} style={d(400)}>
              {tabs.map(([key, label, count]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => switchTab(key)}
                  className={`relative flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 font-semibold transition-colors ${tab === key ? "text-white" : "bg-surface hover:bg-line"}`}
                >
                  {/* One named pill: during a tab switch it glides from the old tab to the new one. */}
                  {tab === key && <span aria-hidden className="absolute inset-0 rounded-full bg-blue" style={{ viewTransitionName: "tab-pill" }} />}
                  {/* Labels get their own layer so the gliding pill passes behind them, not over them. */}
                  <span className="relative flex items-center gap-2" style={{ viewTransitionName: `tab-label-${key}` }}>
                    {label}
                    <span className={`rounded-full px-2 text-xs leading-5 ${tab === key ? "bg-white/20" : "bg-canvas"}`}>{count}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Keyed on the tab: the old list slides out and the new one slides in, toward the tab you picked. */}
            <ViewTransition key={tab} enter={TAB_SLIDE} exit={TAB_SLIDE} default="none">
            <div role="tabpanel" className="mt-6 space-y-4">
              {tab === "friends" && <Friends onCount={setFriendCount} />}
              {tab === "ledger" && <Ledger rows={ledger} />}
              {tab !== "friends" && tab !== "ledger" && list.length === 0 && (
                <div className="rounded-[1.75rem] bg-surface px-8 py-12 text-center">
                  <Asterisk className="mx-auto size-12 text-blue" delay={switched ? 150 : 500} />
                  <p className="mt-5 text-lg font-semibold">
                    {tab === "pending" && "Nobody owes you anything right now."}
                    {tab === "settled" && "No fully paid bills yet."}
                    {tab === "owe" && "You don't owe anyone. Nice."}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                    {tab === "pending" && "Split a bill and every friend gets a PayPal request. Their payments show up here."}
                    {tab === "settled" && "Once everyone on a bill has paid, it moves here."}
                    {tab === "owe" && "When a friend splits a bill with your PayPal email, it shows up here."}
                  </p>
                  {tab !== "owe" && (
                    <Link
                      href="/#split"
                      transitionTypes={["nav-back"]}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2.5 font-semibold text-white hover:brightness-110"
                    >
                      Split a bill
                    </Link>
                  )}
                </div>
              )}

              {list.map((split, n) => {
                const paidCount = split.shares.filter(isPaid).length;
                return (
                  <article key={split.id} className={`rounded-[1.75rem] bg-surface p-6 ${switched ? "" : "a a-up"}`} style={d(500 + n * 110)}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-xl font-bold">{split.merchant || "A bill"}</h2>
                      <p className="text-sm text-muted">
                        {tab === "owe" ? `${(split.payer ?? split.owner).name} paid, ${day(split.createdAt)}` : `${day(split.createdAt)}, ${paidCount} of ${split.shares.length} paid`}
                      </p>
                    </div>
                    {tab !== "owe" && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
                        <div
                          className={`h-full origin-left rounded-full bg-mint ${switched ? "" : "a a-grow"}`}
                          style={d(700 + n * 110, { width: `${(paidCount / split.shares.length) * 100}%` })}
                        />
                      </div>
                    )}
                    <ul className="mt-4 divide-y divide-line">
                      {split.shares.map((s, i) => (
                        <li key={s.invoiceId} className="flex flex-wrap items-center gap-3 py-3">
                          <Avatar name={tab === "owe" ? (split.payer ?? split.owner).name : s.name} tone={TONES[(i + 1) % TONES.length]} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{tab === "owe" ? `You owe ${(split.payer ?? split.owner).name}` : s.name}</p>
                            <p className="truncate text-xs text-muted">
                              {tab === "owe" ? (split.payer ?? split.owner).email : s.email}
                              {isOpen(s) && now > 0 && <span className="text-[#946200] dark:text-[#e2b84a]"> · {waited(split.createdAt, now)}</span>}
                            </p>
                            {tab !== "owe" && s.payout && (() => {
                              const t = payoutText(s.payout, data?.user.email);
                              return (
                                <p className={`mt-0.5 text-xs font-semibold ${t.ok ? "text-[#0f7a55] dark:text-mint" : "text-[#b91c1c]"}`} title={s.payout.error}>
                                  {t.text}
                                </p>
                              );
                            })()}
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
            </ViewTransition>
            <p className="mt-8 text-xs text-muted">
              Friends who haven&apos;t paid get an automatic PayPal reminder after 3 days, then every 3 days (up to 3 times).
              Sandbox demo: requests are sent from Tabby&apos;s PayPal account. Routing money to each person&apos;s own PayPal needs PayPal&apos;s partner program.
            </p>
          </>
        )}
      </main>
    </div>
    </ViewTransition>
  );
}
