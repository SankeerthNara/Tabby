"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Asterisk, Avatar, Scribble, TONES } from "./ui";

/* Scroll-driven "How it works". The section pins to the screen and every
   animation is scrubbed by scroll position (forward on scroll down, rewinds on
   scroll up). Visual language follows the second reference shot: a dark panel
   with a rising phone, and a bento of tiles that grow up with tilted cards. */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// eased local progress of t within [a, b]
const k = (t: number, a: number, b: number) =>
  1 - Math.pow(1 - clamp01((t - a) / (b - a)), 3);
const up = (v: number, dist = 40): CSSProperties => ({
  opacity: v,
  transform: `translateY(${(1 - v) * dist}px)`,
});

const REDUCED = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia(REDUCED);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => matchMedia(REDUCED).matches,
    () => false,
  );
}

// 0 when the section's top reaches mid-screen, 1 when its pinned run ends.
function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    let shown = -1;
    // Glide toward the scroll position instead of jumping with each wheel notch.
    const tick = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const lead = innerHeight * 0.5;
      const run = el.offsetHeight - innerHeight + lead;
      const target = run > 0 ? clamp01((lead - el.getBoundingClientRect().top) / run) : 1;
      shown = shown < 0 || Math.abs(target - shown) < 0.0005 ? target : shown + (target - shown) * 0.08;
      setP(shown);
      if (shown !== target) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return [ref, p] as const;
}

// Words fade up from faint to solid as t moves through [a, b].
function ScrubWords({
  lines,
  t,
  a,
  b,
  accent = [],
  accentClass = "text-mint",
}: {
  lines: string[];
  t: number;
  a: number;
  b: number;
  accent?: string[];
  accentClass?: string;
}) {
  const n = lines.join(" ").split(" ").length;
  let i = 0;
  return lines.map((line, l) => (
    <span key={l} className="block">
      {line.split(" ").map((w, j) => {
        const s = a + (b - a) * 0.65 * (i++ / n);
        const v = k(t, s, s + (b - a) * 0.35);
        return (
          <span key={j}>
            <span
              className={`inline-block ${accent.includes(w) ? accentClass : ""}`}
              style={{
                opacity: 0.12 + 0.88 * v,
                transform: `translateY(${(1 - v) * 0.3}em)`,
                filter: `blur(${(1 - v) * 6}px)`,
              }}
            >
              {w}
            </span>{" "}
          </span>
        );
      })}
    </span>
  ));
}

function Phone({ children, rise }: { children: ReactNode; rise: number }) {
  return (
    <div
      className="h-[94%] w-64 shrink-0 self-end overflow-hidden rounded-t-[2.4rem] border-[7px] border-b-0 border-black bg-white px-5 pb-6 pt-8 text-ink shadow-2xl lg:w-72"
      style={{ transform: `translateY(${(1 - rise) * 105}%)` }}
    >
      <div className="mx-auto -mt-5 mb-4 h-4 w-16 rounded-full bg-black" />
      {children}
    </div>
  );
}

const ITEMS = [
  ["Cheeseburger", "$14.50"],
  ["Loaded Nachos", "$11.00"],
  ["Draft Beer x2", "$14.00"],
  ["Fries", "$3.50"],
];

/* 1. Snap the receipt: dark panel, phone scans, items land on the right */
function SnapScene({ t }: { t: number }) {
  const scan = k(t, 0.35, 0.75);
  return (
    <div
      className="relative grid h-full overflow-hidden rounded-[2rem] bg-ink p-7 text-white md:grid-cols-[1fr_auto_1fr] md:gap-10 lg:p-12"
      style={up(k(t, 0, 0.15), 80)}
    >
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-white/60">Step 1</p>
        <h3 className="mt-2 text-[clamp(2rem,3.4vw,3.25rem)] font-bold leading-[1.05] tracking-tight">
          <ScrubWords
            lines={["Snap the", "receipt"]}
            t={t}
            a={0.1}
            b={0.38}
            accent={["receipt"]}
          />
        </h3>
        <p
          className="mt-4 max-w-xs text-white/70"
          style={up(k(t, 0.28, 0.45), 20)}
        >
          Take a photo at the table. No typing in prices.
        </p>
        <Asterisk
          className="mt-auto hidden size-16 text-mint md:block"
          progress={k(t, 0.35, 0.62)}
        />
      </div>

      <div className="hidden md:flex">
        <Phone rise={k(t, 0.08, 0.35)}>
          <p className="text-xs font-semibold text-muted">Reading receipt</p>
          <div className="relative mt-3 overflow-hidden rounded-xl bg-canvas p-4 text-xs">
            <p className="text-center font-bold tracking-wide">
              JOE&apos;S DINER
            </p>
            {ITEMS.map(([name, price], i) => (
              <p
                key={name}
                className="mt-1.5 flex justify-between rounded px-1 transition-colors"
                style={{
                  background:
                    scan > (i + 1) / 6
                      ? "rgb(59 73 240 / 0.12)"
                      : "transparent",
                }}
              >
                <span>{name}</span>
                <span>{price}</span>
              </p>
            ))}
            <p className="mt-3 flex justify-between border-t border-black/10 px-1 pt-2 font-bold">
              <span>Total</span>
              <span>$46.44</span>
            </p>
            <div
              className="absolute inset-x-0 h-0.5 bg-blue shadow-[0_0_12px_3px_rgb(59_73_240/0.6)]"
              style={{
                top: `${scan * 100}%`,
                opacity: scan > 0 && scan < 1 ? 1 : 0,
              }}
            />
          </div>
          <p className="mt-4 text-xs text-muted">Total bill</p>
          <p className="text-2xl font-bold">$46.44</p>
        </Phone>
      </div>

      <div className="relative mt-8 flex flex-col md:mt-0">
        <h4 className="text-[clamp(1.5rem,2.2vw,2rem)] font-semibold leading-tight">
          <ScrubWords
            lines={["Every line,", "read for you"]}
            t={t}
            a={0.3}
            b={0.52}
            accent={["read"]}
          />
        </h4>
        <ul className="mt-5 space-y-2 text-sm">
          {ITEMS.map(([name, price], i) => (
            <li
              key={name}
              className="flex justify-between rounded-xl bg-white/10 px-4 py-2.5"
              style={up(k(t, 0.45 + i * 0.07, 0.6 + i * 0.07), 18)}
            >
              <span>{name}</span>
              <span className="font-semibold">{price}</span>
            </li>
          ))}
          <li
            className="flex justify-between px-4 pt-1 text-white/70"
            style={up(k(t, 0.74, 0.86), 18)}
          >
            <span>Tax $3.44, tip $0.00</span>
            <span className="font-semibold text-mint">$46.44</span>
          </li>
        </ul>
        <Scribble
          className="absolute -right-4 -top-6 hidden w-28 text-white/50 lg:block"
          progress={k(t, 0.6, 0.9)}
        />
      </div>
    </div>
  );
}

const SENTENCE =
  "I had the burger, Sam and Priya split the nachos, Sam had both beers, fries for everyone.";
const WHO: [string, string[]][] = [
  ["Cheeseburger", ["Me"]],
  ["Loaded Nachos", ["Sam", "Priya"]],
  ["Draft Beer x2", ["Sam"]],
  ["Fries", ["Me", "Sam", "Priya"]],
];
const TONE: Record<string, string[]> = {
  Me: TONES[0],
  Sam: TONES[1],
  Priya: TONES[3],
};

/* 2. Say who had what: blue panel, the sentence types itself, chips land on items */
function SayScene({ t }: { t: number }) {
  const typed = SENTENCE.slice(
    0,
    Math.round(SENTENCE.length * clamp01((t - 0.15) / 0.5)),
  );
  return (
    <div
      className="relative grid h-full overflow-hidden rounded-[2rem] bg-blue p-7 text-white md:grid-cols-[1fr_auto_1fr] md:gap-10 lg:p-12"
      style={up(k(t, 0, 0.15), 80)}
    >
      <div className="flex flex-col">
        <p className="text-sm font-semibold text-white/70">Step 2</p>
        <h3 className="mt-2 text-[clamp(2rem,3.4vw,3.25rem)] font-bold leading-[1.05] tracking-tight">
          <ScrubWords
            lines={["Say who", "had what"]}
            t={t}
            a={0.08}
            b={0.32}
            accent={["what"]}
          />
        </h3>
        <p
          className="mt-4 max-w-xs text-white/80"
          style={up(k(t, 0.25, 0.4), 20)}
        >
          Type it the way you&apos;d say it. Tabby asks if something&apos;s
          unclear.
        </p>
        <Asterisk
          className="mt-auto hidden size-16 text-mint md:block"
          progress={k(t, 0.55, 0.8)}
        />
      </div>

      <div className="hidden md:flex">
        <Phone rise={k(t, 0.05, 0.3)}>
          <p className="text-xs font-semibold text-muted">Who had what?</p>
          <p className="mt-3 min-h-28 rounded-2xl rounded-br-sm bg-blue p-3.5 text-sm leading-relaxed text-white">
            {typed}
            <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-white align-middle" />
          </p>
          <p
            className="mt-3 rounded-2xl rounded-bl-sm bg-canvas p-3.5 text-sm leading-relaxed"
            style={up(k(t, 0.72, 0.85), 12)}
          >
            Got it. Tax and tip split by what each person ordered.
          </p>
        </Phone>
      </div>

      <div className="mt-8 flex flex-col md:mt-0">
        <h4 className="text-[clamp(1.5rem,2.2vw,2rem)] font-semibold leading-tight">
          <ScrubWords
            lines={["Everyone gets", "their own items"]}
            t={t}
            a={0.3}
            b={0.5}
            accent={["own"]}
          />
        </h4>
        <ul className="mt-5 space-y-2 text-sm">
          {WHO.map(([item, people], i) => (
            <li
              key={item}
              className="rounded-xl bg-white/12 px-4 py-2.5"
              style={up(k(t, 0.38 + i * 0.05, 0.5 + i * 0.05), 18)}
            >
              <span>{item}</span>
              <span className="mt-1.5 flex flex-wrap gap-1">
                {people.map((n, j) => {
                  const v = k(
                    t,
                    0.45 + i * 0.08 + j * 0.03,
                    0.55 + i * 0.08 + j * 0.03,
                  );
                  return (
                    <span
                      key={n}
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: TONE[n][0],
                        color: TONE[n][1],
                        opacity: v,
                        transform: `scale(${0.4 + 0.6 * v})`,
                      }}
                    >
                      {n}
                    </span>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Tile grows up from the bottom, like the reference bento.
function Tile({
  g,
  className,
  children,
}: {
  g: number;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 ${className}`}
      style={{ clipPath: `inset(${(1 - g) * 100}% 0 0 0 round 1.5rem)` }}
    >
      {children}
    </div>
  );
}

/* 3. Get paid back: bento of three tiles with cards flying in, tilted */
function PaidScene({ t }: { t: number }) {
  const g = [0, 1, 2].map((i) => k(t, 0.1 + i * 0.08, 0.4 + i * 0.08));
  const fly = [0, 1, 2].map((i) => k(t, 0.3 + i * 0.07, 0.65 + i * 0.07));
  const paid = k(t, 0.78, 0.88);
  return (
    <div
      className="flex h-full flex-col rounded-[2rem] bg-white p-5 lg:p-8"
      style={up(k(t, 0, 0.12), 80)}
    >
      <p className="text-center text-[clamp(1.1rem,1.6vw,1.4rem)] italic leading-snug">
        <ScrubWords
          lines={[
            "Every friend gets a PayPal request.",
            "You just watch them land.",
          ]}
          t={t}
          a={0.02}
          b={0.25}
        />
      </p>
      <div className="mt-5 grid flex-1 gap-3 md:grid-cols-3 lg:gap-4">
        <Tile g={g[0]} className="bg-blue text-white">
          <p className="relative z-10 text-[clamp(1.6rem,2.4vw,2.25rem)] leading-tight">
            <ScrubWords
              lines={["Sam", "paid you"]}
              t={t}
              a={0.4}
              b={0.6}
              accent={["paid", "you"]}
              accentClass="font-bold"
            />
          </p>
          <Asterisk
            className="absolute right-5 top-5 size-9 text-white"
            progress={k(t, 0.55, 0.75)}
          />
          <Scribble
            className="absolute left-4 top-24 hidden w-24 text-white/60 md:block"
            progress={k(t, 0.6, 0.85)}
          />
          <div
            className="absolute bottom-[10%] right-[-8%] hidden w-[86%] rounded-2xl bg-white p-5 text-ink shadow-2xl md:block"
            style={{
              transform: `translate(${(1 - fly[0]) * 60}%, ${(1 - fly[0]) * 110}%) rotate(${-14 - (1 - fly[0]) * 40}deg)`,
            }}
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Avatar name="Sam" tone={TONES[1]} size="size-7" /> Sam
              <span className="ml-auto text-xs font-normal text-muted">
                PayPal request
              </span>
            </p>
            <p className="mt-3 text-4xl font-bold">$26.04</p>
            <p className="mt-1 text-xs text-muted">Dinner at Joe&apos;s</p>
            <span
              className="mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                background: TONES[1][0],
                color: TONES[1][1],
                opacity: paid,
                transform: `scale(${0.4 + 0.6 * paid})`,
              }}
            >
              Paid ✓
            </span>
          </div>
        </Tile>

        <Tile g={g[1]} className="flex flex-col bg-[#e8ecff]">
          <div
            className="mx-auto mt-[12%] hidden w-[88%] rounded-2xl bg-white p-5 text-sm shadow-xl md:block"
            style={{
              transform: `translateY(${(1 - fly[1]) * -140}%) rotate(${6 + (1 - fly[1]) * 30}deg)`,
            }}
          >
            <p className="flex items-center gap-2 font-semibold">
              <Avatar name="Sam" tone={TONES[1]} size="size-6" /> Sam&apos;s
              share
            </p>
            {[
              ["Nachos (1/2)", "$5.50"],
              ["Draft Beer x2", "$14.00"],
              ["Fries (1/3)", "$1.17"],
              ["Tax, tip & fees", "$5.37"],
            ].map(([n, v]) => (
              <p key={n} className="mt-1.5 flex justify-between text-muted">
                <span>{n}</span>
                <span>{v}</span>
              </p>
            ))}
            <p className="mt-2 flex justify-between border-t border-black/10 pt-2 font-bold">
              <span>Total</span>
              <span>$26.04</span>
            </p>
          </div>
          <p className="mt-auto text-[clamp(1.6rem,2.4vw,2.25rem)] leading-tight">
            <ScrubWords
              lines={["Fair to", "the cent"]}
              t={t}
              a={0.48}
              b={0.68}
              accent={["cent"]}
              accentClass="font-bold"
            />
          </p>
        </Tile>

        <Tile g={g[2]} className="bg-ink text-white">
          <p className="relative z-10 text-[clamp(1.6rem,2.4vw,2.25rem)] leading-tight">
            <ScrubWords
              lines={["Nudge", "who's left"]}
              t={t}
              a={0.55}
              b={0.75}
              accent={["left"]}
            />
          </p>
          <div
            className="absolute bottom-[12%] left-[8%] hidden w-[86%] rounded-2xl p-5 text-ink shadow-2xl md:block"
            style={{
              background:
                "linear-gradient(135deg, #c4b5fd, #f9a8d4 35%, #fde68a 60%, #5cf2c0 85%)",
              transform: `translate(${(1 - fly[2]) * 50}%, ${(1 - fly[2]) * 100}%) rotate(${-10 + (1 - fly[2]) * 35}deg)`,
            }}
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Avatar name="Priya" tone={TONES[3]} size="size-7" /> Priya
            </p>
            <p className="mt-3 text-4xl font-bold">$8.39</p>
            <p className="mt-1 text-sm font-semibold">Reminder sent</p>
          </div>
        </Tile>
      </div>
    </div>
  );
}

const STEPS = ["Snap the receipt", "Say who had what", "Get paid back"];
// Scroll window [start, end] of each scene; they overlap so one crossfades into the next.
const WINDOWS = [
  [0, 0.36],
  [0.3, 0.68],
  [0.62, 1],
];
const local = (p: number, i: number) =>
  clamp01((p - WINDOWS[i][0]) / (WINDOWS[i][1] - WINDOWS[i][0]));
const SCENES = [SnapScene, SayScene, PaidScene];

export default function HowItWorks() {
  const [ref, p] = useScrollProgress<HTMLElement>();
  const still = useReducedMotion();

  // Reduced motion: no pinning, every scene shown finished.
  if (still) {
    return (
      <section
        id="how"
        className="mx-auto max-w-7xl scroll-mt-6 space-y-6 px-5 py-16 sm:px-8"
      >
        <h2 className="display text-[clamp(2rem,4vw,3.25rem)]">
          No math. No awkward texts.
        </h2>
        {SCENES.map((Scene, i) => (
          <div key={i} className="h-[36rem]">
            <Scene t={1} />
          </div>
        ))}
      </section>
    );
  }

  return (
    <section id="how" ref={ref} className="relative h-[600svh]">
      <div className="sticky top-0 flex h-svh flex-col px-4 pb-5 pt-6 sm:px-8 lg:pt-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-4">
          <h2 className="display text-[clamp(1.75rem,3.4vw,3rem)]">
            No math. No awkward texts.
          </h2>
          <ol className="flex gap-2 text-sm font-semibold">
            {STEPS.map((label, i) => {
              const fill = local(p, i);
              return (
                <li key={label} className="w-10 sm:w-36">
                  <span
                    className={`hidden sm:block ${fill > 0 ? "text-ink" : "text-muted"}`}
                  >
                    {label}
                  </span>
                  <span className="sm:hidden">{i + 1}</span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-black/10">
                    <span
                      className="block h-full rounded-full bg-blue"
                      style={{ width: `${fill * 100}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mx-auto mt-5 flex w-full max-w-7xl flex-1 items-center">
          <div className="relative h-full max-h-[640px] w-full">
            {SCENES.map((Scene, i) => {
              const t = local(p, i);
              const leave = i < 2 ? k(t, 0.84, 1) : 0;
              if (t <= 0 || leave >= 1) return null;
              return (
                <div
                  key={i}
                  className="absolute inset-0"
                  style={{
                    opacity: 1 - leave,
                    transform: `translateY(${-leave * 60}px) scale(${1 - leave * 0.04})`,
                  }}
                >
                  <Scene t={t} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
