"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, ViewTransition, type CSSProperties } from "react";
import type { Person, Portion, Receipt, Share } from "@/lib/split";
import type { Friend, Group } from "@/lib/store";
import { joinTranscripts } from "@/lib/transcript";
import HowItWorks from "./HowItWorks";
import { Asterisk, Avatar, CountUp, Scribble, ThemeToggle, TONES, Words, d } from "./ui";

type Sent = {
  name: string;
  email: string;
  totalCents: number;
  id?: string;
  payUrl?: string;
  status?: string;
  error?: string;
  chargedCents?: number;
  chargedCurrency?: string;
};

const PAID = ["PAID", "MARKED_AS_PAID"];
const DRAFT = "tabby-draft";
// Home <-> My tabs slide; links pick the direction with transitionTypes, other navigations don't animate.
const SLIDE = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };
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
        <div className="a a-rise w-60 shrink-0 rounded-t-[2.4rem] border-[7px] border-b-0 border-black bg-surface px-5 pb-6 pt-9 text-fg shadow-2xl" style={d(0)}>
          <div className="mx-auto -mt-6 mb-5 h-5 w-20 rounded-full bg-black" />
          <div
            className="a a-ring mx-auto grid size-40 place-items-center rounded-full"
            style={d(700, {
              background: "conic-gradient(var(--blue) 0 35.5%, transparent 0 37%, var(--mint) 0 83.5%, transparent 0 85%, #000 0 98.5%, transparent 0)",
            })}
          >
            <div className="grid size-[7.4rem] place-items-center rounded-full bg-surface text-center">
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

        <div className="a a-up mb-8 hidden w-56 space-y-3 rounded-2xl bg-surface p-4 text-sm text-fg shadow-xl sm:block" style={d(1600)}>
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

// Browser speech-to-text (Chrome, Edge, Safari). No server or quota; Firefox has none, so the button hides.
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
const recognitionCtor = () => {
  const w = window as unknown as Record<string, (new () => Recognition) | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};
const noSubscribe = () => () => {};

function VoiceButton({ value, onChange, onError, disabled }: { value: string; onChange: (v: string) => void; onError: (m: string) => void; disabled: boolean }) {
  const supported = useSyncExternalStore(noSubscribe, () => !!recognitionCtor(), () => false);
  const rec = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  useEffect(() => () => rec.current?.stop(), []);
  if (!supported) return null;

  const toggle = () => {
    if (rec.current) return rec.current.stop();
    const Ctor = recognitionCtor()!;
    const r = new Ctor();
    const before = value.trim(); // speaking adds to what's already typed
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-IN";
    r.onresult = (e) => {
      const said = joinTranscripts(Array.from(e.results, (res) => res[0].transcript));
      onChange(before ? `${before} ${said}` : said);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") onError("Microphone access is blocked. Allow it in your browser's site settings, then try again.");
      else if (e.error !== "no-speech" && e.error !== "aborted") onError(`Voice input stopped (${e.error}). You can type instead.`);
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
    };
    rec.current = r;
    r.start();
    setListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={listening}
      // Idle: filled blue with a soft halo so it reads as the main way in. Recording: red, like any mic.
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40 ${
        listening
          ? "bg-[#e5484d] shadow-[0_0_0_5px_rgb(229_72_77/0.22)]"
          : "bg-blue shadow-[0_0_0_5px_rgb(59_73_240/0.18)] hover:brightness-110 hover:shadow-[0_0_0_7px_rgb(59_73_240/0.22)]"
      }`}
    >
      {listening ? (
        <span aria-hidden className="size-2.5 rounded-full bg-white motion-safe:animate-pulse" />
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      )}
      {listening ? "Listening… tap to stop" : "Say it"}
    </button>
  );
}

// Theme lives on <html data-theme>; layout.tsx sets it before first paint.
// Round "back to top" button, shown once you scroll past most of the first screen.
const onScroll = (cb: () => void) => {
  addEventListener("scroll", cb, { passive: true });
  return () => removeEventListener("scroll", cb);
};
function ScrollTop() {
  const show = useSyncExternalStore(onScroll, () => scrollY > innerHeight * 0.6, () => false);
  return (
    <button
      type="button"
      onClick={() => scrollTo({ top: 0 })} // html { scroll-behavior: smooth } glides it, unless reduced motion is on
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      className={`fixed bottom-6 right-6 z-50 grid size-12 place-items-center rounded-full bg-fg text-surface shadow-lg transition duration-300 hover:bg-blue hover:text-white ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
    </button>
  );
}

function Home() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [people, setPeople] = useState<Person[]>([{ name: "Me", email: "" }, { name: "", email: "" }]);
  const [sentence, setSentence] = useState("");
  const [shares, setShares] = useState<Share[] | null>(null);
  const [assignments, setAssignments] = useState<Portion[][]>([]);
  const [question, setQuestion] = useState("");
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [played, setPlayed] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [payer, setPayer] = useState(0); // index in people of who paid the restaurant; you by default
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState<string | null>(null); // non-null while naming a new group
  const [note, setNote] = useState("");
  const loadFriends = () =>
    fetch("/api/friends")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setFriends(d.friends);
        setGroups(d.groups);
      })
      .catch(() => {});
  const [appRef, appPlay] = useInView<HTMLElement>();
  // Who's logged in, plus restore a split saved before going off to "Log in with PayPal".
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user);
        if (d.user) {
          setPeople((ps) => (ps[0].name === "Me" ? [{ ...ps[0], name: d.user.name }, ...ps.slice(1)] : ps));
          loadFriends();
        }
        const failed = new URLSearchParams(location.search).get("login");
        if (failed) setError(`Couldn't log in with PayPal: ${failed}`);
        const draft = sessionStorage.getItem(DRAFT);
        if (!draft) return;
        sessionStorage.removeItem(DRAFT);
        const v = JSON.parse(draft);
        setReceipt(v.receipt);
        setPeople(v.people);
        setSentence(v.sentence);
        setShares(v.shares);
        setAssignments(v.assignments);
        setQuestion(v.question);
        setPayer(v.payer ?? 0);
      })
      .catch(() => {});
  }, []);
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

  const onSend = () => {
    if (!user) {
      // Keep the split while the user logs in with PayPal, then bring them back to it.
      sessionStorage.setItem(DRAFT, JSON.stringify({ receipt, people, sentence, shares, assignments, question, payer }));
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full navigation: the route redirects off-site to PayPal
      location.href = "/api/auth/login?next=/%23split";
      return;
    }
    run("send", async () => {
      const paidBy = people[payer];
      if (payer !== 0 && !/^\S+@\S+\.\S+$/.test(paidBy.email)) throw new Error(`Add ${paidBy.name || "the payer"}'s PayPal email, so the split shows up in their tabs.`);
      const owed = shares!
        .map((s, i) => (i === 0 ? { ...s, email: user.email } : s))
        .filter((s, i) => i !== payer && s.totalCents > 0);
      const data = await post("/api/send", {
        shares: owed,
        currency: receipt!.currency,
        merchant: receipt!.merchant,
        payer: payer === 0 ? undefined : { name: paidBy.name, email: paidBy.email },
      });
      setSent(data.sent);
      if (data.saveError) setError(data.saveError);
      loadFriends(); // everyone you just billed is now a saved friend
    });
  };

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
  const removePerson = (i: number) => {
    setPeople((ps) => ps.filter((_, j) => j !== i));
    setPayer((pi) => (pi === i ? 0 : pi > i ? pi - 1 : pi));
  };
  // Typing a saved friend's name fills in their email.
  const onName = (i: number, name: string) => {
    const f = friends.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    setPerson(i, f && !people[i].email ? { name, email: f.email } : { name });
  };
  const inRows = new Set(people.map((p) => p.email.toLowerCase()).filter(Boolean));
  const recent = friends.filter((f) => !inRows.has(f.email)).slice(0, 6);
  const addFriend = (f: Person) =>
    setPeople((ps) => {
      const empty = ps.findIndex((p, j) => j > 0 && !p.name && !p.email);
      return empty > 0 ? ps.map((p, j) => (j === empty ? { name: f.name, email: f.email } : p)) : [...ps, { name: f.name, email: f.email }];
    });
  // Picking a group seats exactly its members at the table (you stay in the first row).
  const seatGroup = (id: string) => {
    const g = groups.find((x) => x.id === id);
    if (!g) return;
    const members = g.members.filter((m) => m.email.toLowerCase() !== user?.email);
    setPeople((ps) => [ps[0], ...(members.length ? members.map((m) => ({ ...m })) : [{ name: "", email: "" }])]);
    setPayer(0);
    setNote(`Seated ${g.name}: ${members.map((m) => m.name).join(", ")}`);
  };
  const tableFriends = people.slice(1).filter((p) => p.name.trim() && /^\S+@\S+\.\S+$/.test(p.email));
  const saveAsGroup = () =>
    run("group", async () => {
      const name = groupName!.trim();
      if (!name) throw new Error("Give the group a name, like Goa trip.");
      const d = await post("/api/friends", { action: "saveGroup", group: { name, members: tableFriends.map(({ name, email }) => ({ name, email })) } });
      setGroups(d.groups);
      setFriends(d.friends);
      setGroupName(null);
      setNote(`Saved group ${name}. Pick it next time to seat everyone at once.`);
    });

  const field =
    "w-full rounded-xl bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";
  const card = "flex flex-col rounded-[1.75rem] bg-surface p-6";
  const fileInput = (
    <input type="file" accept="image/*" className="sr-only" disabled={!!busy} onChange={(e) => onReceipt(e.target.files?.[0])} />
  );
  const statusOf = (name: string) => sent?.find((s) => s.name === name);
  const paidCount = sent?.filter((s) => PAID.includes(s.status ?? "")).length ?? 0;
  const totalCents = shares?.reduce((a, s) => a + s.totalCents, 0) ?? 0;

  return (
    <ViewTransition enter={SLIDE} exit={SLIDE} default="none">
    <div className="flex flex-1 flex-col">
      <nav className={`mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 ${played ? "play" : ""}`} style={{ viewTransitionName: "site-nav" }}>
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
          <span className="hidden rounded-full border border-line px-4 py-2 sm:inline">Payments by PayPal</span>
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/tabs" transitionTypes={["nav-forward"]} className="rounded-full bg-fg px-4 py-2 text-surface hover:bg-blue hover:text-white">
                My tabs
              </Link>
              <form action="/api/auth/logout" method="post">
                <button className="rounded-full border border-line px-4 py-2 hover:border-fg">Log out</button>
              </form>
            </>
          ) : (
            <a href="/api/auth/login?next=/tabs" className="rounded-full bg-fg px-4 py-2 text-surface hover:bg-blue hover:text-white">Log in with PayPal</a>
          )}
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
              <a href="#how" className="a a-up rounded-full border border-line bg-surface px-6 py-3.5 font-semibold hover:border-fg" style={d(1250)}>
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
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-surface px-5 py-3 font-semibold"
              >
                <Asterisk className="size-3.5 text-blue" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </header>


      <section id="split" ref={appRef} className={`mx-3 mb-6 scroll-mt-4 rounded-[2.5rem] bg-ink px-4 py-10 ring-1 ring-line sm:mx-6 sm:px-8 lg:px-12 lg:py-14 ${appPlay}`}>
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
                <label className="mt-4 grid flex-1 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-line bg-canvas px-6 py-14 text-center hover:border-blue">
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
                  <ul className="mt-3 divide-y divide-line">
                    {receipt.items.map((it, i) => {
                      const who: Portion[] = assignments.length ? (assignments[i]?.length ? assignments[i] : people.map((p) => ({ name: p.name, units: 1 }))) : [];
                      return (
                        <li key={i} className="py-2.5">
                          <div className="flex justify-between gap-4">
                            <span>{it.name}</span>
                            <span className="font-medium tabular-nums">{fmt(Math.round(it.price * 100))}</span>
                          </div>
                          {who.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {who.map(({ name: n, units }) => (
                                <span key={n} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: tone(n)[0], color: tone(n)[1] }}>
                                  {n}
                                  {units !== 1 && ` ×${+units.toFixed(2)}`}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold">Who&apos;s at the table?</h3>
                {groups.length > 0 && (
                  <select
                    aria-label="Use a group"
                    value=""
                    onChange={(e) => seatGroup(e.target.value)}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue"
                  >
                    <option value="">Use a group</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.members.length})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {recent.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Recent friends">
                  {recent.map((f) => (
                    <button
                      key={f.email}
                      onClick={() => addFriend(f)}
                      title={f.email}
                      className="flex items-center gap-1.5 rounded-full border border-line py-1 pl-1 pr-3 text-xs font-semibold hover:border-fg"
                    >
                      <Avatar name={f.name} tone={TONES[(friends.indexOf(f) + 1) % TONES.length]} size="size-6" />+ {f.name}
                    </button>
                  ))}
                </div>
              )}

              <ul className="mt-4 space-y-3" role="radiogroup" aria-label="Who paid the bill">
                {people.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Avatar name={p.name} tone={TONES[i % TONES.length]} />
                    <div className="grid min-w-0 flex-1 gap-1.5">
                      <input
                        className={field}
                        placeholder="Name"
                        list="tabby-friends"
                        aria-label={i === 0 ? "Your name" : `Friend ${i} name`}
                        value={p.name}
                        onChange={(e) => onName(i, e.target.value)}
                      />
                      {i === 0 ? (
                        <p className="truncate px-1 text-xs text-muted">{user ? `You · ${user.email}` : "You"}</p>
                      ) : (
                        <input
                          className={field}
                          type="email"
                          placeholder="PayPal email"
                          aria-label={`Friend ${i} PayPal email`}
                          value={p.email}
                          onChange={(e) => setPerson(i, { email: e.target.value })}
                        />
                      )}
                    </div>
                    <button
                      role="radio"
                      aria-checked={payer === i}
                      aria-label={`${p.name || (i === 0 ? "You" : `Friend ${i}`)} paid the bill`}
                      onClick={() => setPayer(i)}
                      className={`mt-1 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        payer === i ? "bg-blue text-white" : "border border-line text-muted hover:border-fg hover:text-fg"
                      }`}
                    >
                      {payer === i ? "Paid ✓" : "Paid"}
                    </button>
                    {i > 0 && people.length > 2 && (
                      <button
                        className="mt-1 grid size-8 shrink-0 place-items-center rounded-full text-xl text-muted hover:bg-canvas hover:text-fg"
                        aria-label={`Remove ${p.name || `friend ${i}`}`}
                        onClick={() => removePerson(i)}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <datalist id="tabby-friends">
                {friends.map((f) => (
                  <option key={f.email} value={f.name}>
                    {f.email}
                  </option>
                ))}
              </datalist>
              <p className="mt-2 text-xs text-muted">Tap Paid next to whoever paid the restaurant. Everyone else gets a PayPal request.</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button className="text-sm font-semibold text-blue hover:underline" onClick={() => setPeople([...people, { name: "", email: "" }])}>
                  + Add a friend
                </button>
                {user && tableFriends.length > 0 && groupName === null && (
                  <button className="text-sm font-semibold text-blue hover:underline" onClick={() => setGroupName("")}>
                    Save these people as a group
                  </button>
                )}
              </div>
              {groupName !== null && (
                <div className="mt-3 flex gap-2">
                  <input
                    className={field}
                    autoFocus
                    placeholder="Group name, like Goa trip"
                    aria-label="Group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveAsGroup()}
                  />
                  <button className="shrink-0 rounded-full bg-blue px-4 text-sm font-semibold text-white disabled:opacity-40" disabled={busy === "group"} onClick={saveAsGroup}>
                    Save
                  </button>
                  <button className="shrink-0 rounded-full border border-line px-3 text-sm font-semibold" onClick={() => setGroupName(null)}>
                    Cancel
                  </button>
                </div>
              )}
              {note && (
                <p role="status" className="mt-2 text-xs font-semibold text-[#0f7a55] dark:text-mint">
                  {note}
                </p>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">Who had what?</h3>
                <VoiceButton value={sentence} onChange={setSentence} onError={setError} disabled={!!busy} />
              </div>
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
                  <ul className="mt-4 divide-y divide-line">
                    {shares.map((s, i) => {
                      const st = statusOf(s.name);
                      const paid = PAID.includes(st?.status ?? "");
                      return (
                        <li key={s.name} className="a a-up py-3.5" style={d(i * 110)}>
                          <div className="flex items-center gap-3">
                            <Avatar name={s.name} tone={tone(s.name)} />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">{s.name}{i === 0 && " (you)"}</p>
                              <p className="truncate text-xs text-muted">
                                {i === payer ? "Paid the bill" : i === 0 ? (user?.email ?? "You") : s.email || "Add their PayPal email"}
                              </p>
                              {st?.chargedCurrency && st.chargedCurrency !== receipt?.currency && st.chargedCents !== undefined && (
                                <p className="text-xs font-semibold text-blue">
                                  Requested as{" "}
                                  {new Intl.NumberFormat(undefined, { style: "currency", currency: st.chargedCurrency }).format(st.chargedCents / 100)} on PayPal
                                </p>
                              )}
                            </div>
                            <span className="text-lg font-bold tabular-nums">
                              <CountUp value={s.totalCents} format={fmt} delay={i * 110} />
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 pl-12 text-xs">
                            <details>
                              <summary className="cursor-pointer text-muted hover:text-fg">What&apos;s included</summary>
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
                                  className="rounded-full border border-line px-2.5 py-1 font-semibold hover:border-fg disabled:opacity-40"
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
                      className="mt-auto w-full rounded-full bg-fg py-3.5 font-semibold text-surface hover:bg-blue hover:text-white disabled:opacity-40"
                      disabled={!!busy}
                      onClick={onSend}
                    >
                      {busy === "send" ? "Sending requests…" : user ? "Send PayPal requests" : "Log in with PayPal to send"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      <HowItWorks />
      <ScrollTop />
    </div>
    </ViewTransition>
  );
}

// A fresh split each time you arrive by a link (e.g. "Split a bill" in My tabs). Next keeps visited
// pages alive with React Activity, so without this key the previous bill would still be on screen.
// Browser Back keeps the same id, so going back still restores what you were doing.
export default function Page() {
  const { bfcacheId } = useRouter();
  return <Home key={bfcacheId} />;
}
