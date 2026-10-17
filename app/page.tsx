"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Person, Receipt, Share } from "@/lib/split";
import HowItWorks from "./HowItWorks";
import { Asterisk, Avatar, Scribble, TONES, d } from "./ui";

type Sent = { name: string; email: string; totalCents: number; id?: string; payUrl?: string; status?: string; error?: string };

const PAID = ["PAID", "MARKED_AS_PAID"];
// Phone photos are huge; shrink to 1600px JPEG first.
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((ok) => canvas.toBlob((b) => ok(b!), "image/jpeg", 0.85));
}

async function post(url: string, body: BodyInit | object) {
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method: "POST",
    body: isForm ? body : JSON.stringify(body),
    headers: isForm ? undefined : { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

// Adds .play once the element scrolls into view, so its animations start then.
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, inView ? "play" : ""] as const;
}

// Word-by-word reveal used for every big heading.
function Words({ lines, delay = 0 }: { lines: string[]; delay?: number }) {
  let i = 0;
  return lines.map((line, l) => (
    <span key={l} className="block">
      {line.split(" ").map((w, k) => (
        <span key={k}>
          <span className="a a-word inline-block" style={d(delay, { "--i": i++ } as CSSProperties)}>
            {w}
          </span>{" "}
        </span>
      ))}
    </span>
  ));
}

// Counts up to a value with the same expo-out feel as the rest of the motion.
function CountUp({ value, format, delay = 0 }: { value: number; format: (v: number) => string; delay?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now() + delay;
    let raf = 0;
    const tick = (t: number) => {
      const k = still ? 1 : Math.min(1, Math.max(0, (t - t0) / 1000));
      setV(Math.round(value * (k === 1 ? 1 : 1 - Math.pow(2, -10 * k))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay]);
  return <>{format(v)}</>;
}

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const SPLITS = ["Dinner at Joe's", "Pizza night", "Road trip gas", "Groceries", "Birthday brunch", "Concert tickets", "Cabin weekend", "Coffee run", "Team lunch", "Movie night"];

function ArrowButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-4 rounded-full bg-blue py-1.5 pl-6 pr-1.5 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
      <span className="grid size-10 place-items-center rounded-full bg-white text-blue">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}

function ArrowLink({ href, children, className = "", style }: { href: string; children: React.ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <a
      href={href}
      style={style}
      className={`inline-flex items-center gap-4 rounded-full bg-blue py-1.5 pl-6 pr-1.5 font-semibold text-white transition hover:brightness-110 ${className}`}
    >
      {children}
      <span className="grid size-10 place-items-center rounded-full bg-white text-blue">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </a>
  );
}

// Static illustration of a finished split. Build order follows the reference intro:
// phone rises, blue panel wipes open behind it, then ring, avatars, asterisk, scribble, card.
function HeroPanel() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] px-6 pt-7 text-white sm:px-10">
      <div aria-hidden className="a a-wipe absolute inset-0 rounded-[2rem] bg-blue" style={d(350)} />
      <div className="relative flex items-center gap-3 pr-14 sm:pr-0">
        <div className="flex -space-x-3">
          {(
            [
              ["Me", 0],
              ["Sam", 1],
              ["Priya", 3],
            ] as const
          ).map(([n, t], i) => (
            <Avatar key={n} name={n} tone={TONES[t]} size="size-11" className="a a-pop" style={d(950 + i * 90)} />
          ))}
        </div>
        <p className="a a-up leading-tight" style={d(1150)}>
          <span className="block text-2xl font-bold">
            <CountUp value={5418} format={usd} delay={1150} />
          </span>
          <span className="text-sm text-white/80">Dinner at Joe&apos;s, split 3 ways</span>
        </p>
      </div>
      <Asterisk className="absolute right-5 top-5 size-12 text-mint sm:right-6 sm:top-6 sm:size-24" delay={1250} />
      <Scribble className="absolute -right-4 top-28 hidden w-40 text-white/70 sm:block" delay={1500} />

      <div className="relative mt-8 flex items-end gap-4">
        <div className="a a-rise w-60 shrink-0 rounded-t-[2.4rem] border-[7px] border-b-0 border-black bg-white px-5 pb-6 pt-9 text-ink shadow-2xl" style={d(0)}>
          <div className="mx-auto -mt-6 mb-5 h-5 w-20 rounded-full bg-black" />
          <div
            className="a a-ring mx-auto grid size-40 place-items-center rounded-full"
            style={d(700, {
              background: "conic-gradient(var(--blue) 0 35.5%, transparent 0 37%, var(--mint) 0 83.5%, transparent 0 85%, #000 0 98.5%, transparent 0)",
            })}
          >
            <div className="grid size-[7.4rem] place-items-center rounded-full bg-white text-center">
              <div>
                <p className="text-xs text-muted">Total bill</p>
                <p className="text-2xl font-bold">
                  <CountUp value={5418} format={usd} delay={700} />
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-1.5 text-xs font-semibold">
            {(
              [
                ["Me $19.75", 0],
                ["Sam $26.04", 1],
                ["Priya $8.39", 7],
              ] as const
            ).map(([label, t], i) => (
              <span key={label} className="a a-pop rounded-full px-2.5 py-1" style={d(1300 + i * 90, { background: TONES[t][0], color: TONES[t][1] })}>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="a a-up mb-8 hidden w-56 space-y-3 rounded-2xl bg-white p-4 text-sm text-ink shadow-xl sm:block" style={d(1600)}>
          <div className="flex items-center gap-3">
            <Avatar name="Sam" tone={TONES[1]} />
            <p className="leading-tight">
              <span className="font-semibold">Sam paid you</span>
              <span className="block text-muted">via PayPal</span>
            </p>
            <span className="ml-auto font-semibold text-[#0f7a55]">$26.04</span>
          </div>
          <div className="a a-up flex items-center gap-3" style={d(1800)}>
            <Avatar name="Priya" tone={TONES[3]} />
            <p className="leading-tight">
              <span className="font-semibold">Priya nudged</span>
              <span className="block text-muted">reminder sent</span>
            </p>
            <span className="ml-auto font-semibold text-muted">$8.39</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [people, setPeople] = useState<Person[]>([{ name: "Me", email: "" }, { name: "", email: "" }]);
  const [sentence, setSentence] = useState("");
  const [shares, setShares] = useState<Share[] | null>(null);
  const [assignments, setAssignments] = useState<string[][]>([]);
  const [question, setQuestion] = useState("");
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [played, setPlayed] = useState(false);
  const [appRef, appPlay] = useInView<HTMLElement>();
  useEffect(() => {
    const id = requestAnimationFrame(() => setPlayed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const fmt = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: receipt?.currency || "USD" }).format(cents / 100);
  const tone = (name: string) => TONES[Math.max(0, people.findIndex((p) => p.name === name)) % TONES.length];

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const onReceipt = (file?: File) =>
    file &&
    run("receipt", async () => {
      const form = new FormData();
      form.append("receipt", new File([await shrink(file)], "receipt.jpg", { type: "image/jpeg" }));
      setReceipt(await post("/api/receipt", form));
      setShares(null);
      setAssignments([]);
      setSent(null);
    });

  const onSplit = () =>
    run("split", async () => {
      const data = await post("/api/split", { receipt, people, sentence });
      setShares(data.shares);
      setAssignments(data.assignments);
      setQuestion(data.question);
      setSent(null);
    });

  const onSend = () =>
    run("send", async () => {
      const owed = shares!.slice(1).filter((s) => s.totalCents > 0);
      setSent(await post("/api/send", { shares: owed, currency: receipt!.currency, merchant: receipt!.merchant }));
    });

  const onNudge = (id: string) => run(`nudge-${id}`, async () => void (await post("/api/invoices", { id })));

  // Poll PayPal until everyone has paid.
  const openIds = sent?.filter((s) => s.id && !PAID.includes(s.status ?? "")).map((s) => s.id).join(",");
  useEffect(() => {
    if (!openIds) return;
    const t = setInterval(async () => {
      const statuses: { id: string; status: string }[] = await (await fetch(`/api/invoices?ids=${openIds}`)).json();
      setSent((prev) => prev!.map((s) => ({ ...s, status: statuses.find((x) => x.id === s.id)?.status ?? s.status })));
    }, 5000);
    return () => clearInterval(t);
  }, [openIds]);

  const setPerson = (i: number, patch: Partial<Person>) =>
    setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const field =
    "w-full rounded-xl bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
  const card = "flex flex-col rounded-[1.75rem] bg-white p-6";
  const fileInput = (
    <input type="file" accept="image/*" className="sr-only" disabled={!!busy} onChange={(e) => onReceipt(e.target.files?.[0])} />
  );
  const statusOf = (name: string) => sent?.find((s) => s.name === name);
  const paidCount = sent?.filter((s) => PAID.includes(s.status ?? "")).length ?? 0;
  const totalCents = shares?.reduce((a, s) => a + s.totalCents, 0) ?? 0;

  return (
    <>
      <nav className={`mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 ${played ? "play" : ""}`}>
        <a href="#" className="a a-up flex items-center gap-2 text-xl font-bold" style={d(1700)}>
          <span className="grid size-8 place-items-center rounded-lg bg-blue text-white">
            <Asterisk className="size-4" />
          </span>
          Tabby
        </a>
        <div className="a a-up hidden gap-8 text-sm font-medium md:flex" style={d(1800)}>
          <a href="#split" className="hover:text-blue">Split a bill</a>
          <a href="#how" className="hover:text-blue">How it works</a>
        </div>
        <div className="a a-up flex items-center gap-2 text-sm font-medium" style={d(1900)}>
          <span className="hidden rounded-full border border-black/15 px-4 py-2 sm:inline">Payments by PayPal</span>
          <a href="#split" className="rounded-full bg-ink px-4 py-2 text-white hover:bg-blue">Split a bill</a>
        </div>
      </nav>

      <header className={`grid-lines ${played ? "play" : ""}`}>
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-2 lg:pt-14">
          <div className="lg:order-2">
            <h1 className="display text-[clamp(2.75rem,6.4vw,5.5rem)] uppercase">
              <Words lines={["Snap it.", "Say it.", "Settled."]} delay={250} />
            </h1>
            <p className="a a-up mt-6 max-w-lg text-lg leading-relaxed text-muted" style={d(900)}>
              Take a photo of the receipt and tell Tabby who had what. Every friend gets an itemized PayPal request, and you
              can see who&apos;s paid without chasing anyone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ArrowLink href="#split" className="a a-pill" style={d(1100)}>
                Split a bill
              </ArrowLink>
              <a href="#how" className="a a-up rounded-full border border-black/15 bg-white px-6 py-3.5 font-semibold hover:border-black" style={d(1250)}>
                How it works
              </a>
            </div>
          </div>
          <div className="lg:order-1">
            <HeroPanel />
          </div>
        </div>
        <div className="marquee a a-up overflow-hidden pb-14" style={d(1500)}>
          <ul className="marquee-track gap-3">
            {[...SPLITS, ...SPLITS].map((label, i) => (
              <li
                key={i}
                aria-hidden={i >= SPLITS.length}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-3 font-semibold"
              >
                <Asterisk className="size-3.5 text-blue" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </header>


      <section id="split" ref={appRef} className={`mx-3 mb-6 scroll-mt-4 rounded-[2.5rem] bg-ink px-4 py-10 sm:mx-6 sm:px-8 lg:px-12 lg:py-14 ${appPlay}`}>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4 text-white">
            <h2 className="display text-[clamp(2.25rem,5vw,4rem)]">
              <Words lines={["Split a bill"]} />
            </h2>
            <span className="a a-up rounded-full border border-white/25 px-4 py-2 text-sm" style={d(300)}>PayPal sandbox</span>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {/* Receipt */}
            <div
              className={`${card} a a-up`}
              style={d(250)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onReceipt(e.dataTransfer.files[0]);
              }}
            >
              <h3 className="text-lg font-bold">Receipt</h3>
              {!receipt ? (
                <label className="mt-4 grid flex-1 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-black/15 bg-canvas px-6 py-14 text-center hover:border-blue">
                  {fileInput}
                  {busy === "receipt" ? (
                    <span role="status" className="font-semibold motion-safe:animate-pulse">Reading your receipt…</span>
                  ) : (
                    <span>
                      <span className="mx-auto grid size-14 place-items-center rounded-full bg-blue text-white">
                        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
                          <circle cx="12" cy="13" r="3.5" />
                        </svg>
                      </span>
                      <span className="mt-4 block font-semibold">Take or upload a photo</span>
                      <span className="mt-1 block text-sm text-muted">or drop the image here</span>
                    </span>
                  )}
                </label>
              ) : (
                <div className="mt-4 text-sm">
                  <p className="font-semibold">{receipt.merchant || "Your receipt"}</p>
                  <ul className="mt-3 divide-y divide-black/5">
                    {receipt.items.map((it, i) => {
                      const who = assignments.length ? (assignments[i]?.length ? assignments[i] : people.map((p) => p.name)) : [];
                      return (
                        <li key={i} className="py-2.5">
                          <div className="flex justify-between gap-4">
                            <span>{it.name}</span>
                            <span className="font-medium tabular-nums">{fmt(Math.round(it.price * 100))}</span>
                          </div>
                          {who.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {who.map((n) => (
                                <span key={n} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: tone(n)[0], color: tone(n)[1] }}>
                                  {n}
                                </span>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-2 space-y-1 rounded-xl bg-canvas p-3.5">
                    <p className="flex justify-between text-muted"><span>Tax</span><span className="tabular-nums">{fmt(Math.round(receipt.tax * 100))}</span></p>
                    <p className="flex justify-between text-muted"><span>Tip on receipt</span><span className="tabular-nums">{fmt(Math.round(receipt.tip * 100))}</span></p>
                    <p className="flex justify-between pt-1 text-base font-bold"><span>Total</span><span className="tabular-nums">{fmt(Math.round(receipt.total * 100))}</span></p>
                  </div>
                  <label className="mt-4 inline-block cursor-pointer font-semibold text-blue hover:underline">
                    {fileInput}
                    {busy === "receipt" ? "Reading your receipt…" : "Use a different receipt"}
                  </label>
                </div>
              )}
            </div>

            {/* People + who had what */}
            <div className={`${card} a a-up`} style={d(390)}>
              <h3 className="text-lg font-bold">Who&apos;s at the table?</h3>
              <ul className="mt-4 space-y-2">
                {people.map((p, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Avatar name={p.name} tone={TONES[i % TONES.length]} />
                    <input
                      className={`${field} max-w-28`}
                      placeholder="Name"
                      aria-label={i === 0 ? "Your name" : `Friend ${i} name`}
                      value={p.name}
                      onChange={(e) => setPerson(i, { name: e.target.value })}
                    />
                    {i === 0 ? (
                      <span className="text-sm text-muted">paid the bill</span>
                    ) : (
                      <>
                        <input
                          className={field}
                          type="email"
                          placeholder="PayPal email"
                          aria-label={`Friend ${i} PayPal email`}
                          value={p.email}
                          onChange={(e) => setPerson(i, { email: e.target.value })}
                        />
                        {people.length > 2 && (
                          <button
                            className="grid size-8 shrink-0 place-items-center rounded-full text-xl text-muted hover:bg-canvas hover:text-ink"
                            aria-label={`Remove ${p.name || `friend ${i}`}`}
                            onClick={() => setPeople(people.filter((_, j) => j !== i))}
                          >
                            ×
                          </button>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <button className="mt-3 self-start text-sm font-semibold text-blue hover:underline" onClick={() => setPeople([...people, { name: "", email: "" }])}>
                + Add a friend
              </button>

              <h3 className="mt-8 text-lg font-bold">Who had what?</h3>
              <textarea
                className={`${field} mt-3 h-28 resize-none`}
                aria-label="Who had what"
                placeholder="I had the burger, Sam and Priya split the nachos, Sam had the beers. Add 18% tip."
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
              />
              <ArrowButton className="mt-4 self-start" disabled={!!busy || !receipt || !sentence.trim()} onClick={onSplit}>
                {busy === "split" ? "Splitting…" : "Split the bill"}
              </ArrowButton>
              {!receipt && <p className="mt-2 text-sm text-muted">Add the receipt first.</p>}
              {question && (
                <p className="mt-4 rounded-xl p-3.5 text-sm" style={{ background: TONES[5][0], color: TONES[5][1] }}>
                  <strong>Tabby isn&apos;t sure:</strong> {question} Reword it and split again.
                </p>
              )}
              {error && (
                <p role="alert" className="mt-4 rounded-xl bg-[#fde8e8] p-3.5 text-sm font-medium text-[#b91c1c]">
                  {error}
                </p>
              )}
            </div>

            {/* Shares + payment status */}
            <div className={`${card} a a-up`} style={d(530)} aria-live="polite">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-bold">Everyone&apos;s share</h3>
                {shares && <span className="text-sm text-muted">Total {fmt(totalCents)}</span>}
              </div>
              {!shares ? (
                <div className="mt-4 grid flex-1 place-items-center rounded-2xl bg-canvas px-6 py-14 text-center text-sm text-muted">
                  Your split shows up here once you tell Tabby who had what.
                </div>
              ) : (
                <>
                  {sent && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold">
                        {paidCount === sent.length ? "Everyone's paid. Tab settled." : `${paidCount} of ${sent.length} paid`}
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
                        <div className="h-full rounded-full bg-mint transition-all duration-700" style={{ width: `${(paidCount / sent.length) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  <ul className="mt-4 divide-y divide-black/5">
                    {shares.map((s, i) => {
                      const st = statusOf(s.name);
                      const paid = PAID.includes(st?.status ?? "");
                      return (
                        <li key={s.name} className="a a-up py-3.5" style={d(i * 110)}>
                          <div className="flex items-center gap-3">
                            <Avatar name={s.name} tone={tone(s.name)} />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">{s.name}{i === 0 && " (you)"}</p>
                              <p className="truncate text-xs text-muted">{i === 0 ? "Paid the bill" : s.email || "Add their PayPal email"}</p>
                            </div>
                            <span className="text-lg font-bold tabular-nums">
                              <CountUp value={s.totalCents} format={fmt} delay={i * 110} />
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 pl-12 text-xs">
                            <details>
                              <summary className="cursor-pointer text-muted hover:text-ink">What&apos;s included</summary>
                              <ul className="mt-1.5 space-y-0.5">
                                {s.lines.map((l, j) => (
                                  <li key={j} className="flex justify-between gap-3">
                                    <span>{l.name}</span>
                                    <span className="tabular-nums">{fmt(l.cents)}</span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                            {st?.error ? (
                              <span className="text-[#b91c1c]">Couldn&apos;t send</span>
                            ) : paid ? (
                              <span className="pop rounded-full px-2.5 py-1 font-semibold" style={{ background: TONES[1][0], color: TONES[1][1] }}>
                                Paid ✓
                              </span>
                            ) : st?.id ? (
                              <span className="flex items-center gap-1.5">
                                <a className="rounded-full px-2.5 py-1 font-semibold hover:underline" style={{ background: TONES[5][0], color: TONES[5][1] }} href={st.payUrl} target="_blank" rel="noreferrer">
                                  Waiting
                                </a>
                                <button
                                  className="rounded-full border border-black/15 px-2.5 py-1 font-semibold hover:border-black disabled:opacity-40"
                                  disabled={!!busy}
                                  onClick={() => onNudge(st.id!)}
                                >
                                  {busy === `nudge-${st.id}` ? "Nudging…" : "Nudge"}
                                </button>
                              </span>
                            ) : null}
                          </div>
                          {st?.error && <p className="mt-1 pl-12 text-xs text-[#b91c1c]">{st.error}</p>}
                        </li>
                      );
                    })}
                  </ul>
                  {!sent && (
                    <button
                      className="mt-auto w-full rounded-full bg-ink py-3.5 font-semibold text-white hover:bg-blue disabled:opacity-40"
                      disabled={!!busy}
                      onClick={onSend}
                    >
                      {busy === "send" ? "Sending requests…" : "Send PayPal requests"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      <HowItWorks />
    </>
  );
}
