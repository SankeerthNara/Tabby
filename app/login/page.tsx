"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Asterisk, Avatar, Scribble, ThemeToggle, TONES, d } from "../ui";

const noSubscribe = () => () => {};
const query = (key: string) => () => new URLSearchParams(location.search).get(key) ?? "";

export default function Login() {
  const error = useSyncExternalStore(noSubscribe, query("error"), () => "");
  const nextPath = useSyncExternalStore(noSubscribe, query("next"), () => "");
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPlayed(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const href = `/api/auth/login?next=${encodeURIComponent(nextPath.startsWith("/") ? nextPath : "/")}`;

  return (
    <main className={`grid-lines relative flex flex-1 items-center ${played ? "play" : ""}`}>
      <div className="absolute right-5 top-5 sm:right-8">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="a a-up flex items-center gap-2 text-xl font-bold" style={d(0)}>
            <span className="grid size-9 place-items-center rounded-lg bg-blue text-white">
              <Asterisk className="size-5" />
            </span>
            Tabby
          </p>
          <h1 className="a a-up display mt-10 text-[clamp(2.6rem,6vw,5rem)] uppercase" style={d(120)}>
            Split the bill.
            <br />
            Get paid back.
          </h1>
          <p className="a a-up mt-6 max-w-md text-lg leading-relaxed text-muted" style={d(260)}>
            Log in with PayPal to split receipts with friends, send their requests, and keep track of who still owes you.
          </p>

          <a
            href={href}
            className="a a-pill mt-9 inline-flex items-center gap-4 rounded-full bg-blue py-2 pl-7 pr-2 text-lg font-semibold text-white transition hover:brightness-110"
            style={d(420)}
          >
            Log in with PayPal
            <span className="grid size-11 place-items-center rounded-full bg-white text-blue">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </a>

          {error && (
            <p role="alert" className="mt-5 max-w-md rounded-xl bg-[#fde8e8] p-3.5 text-sm font-medium text-[#b91c1c]">
              Couldn&apos;t log in with PayPal: {error}
            </p>
          )}

          <p className="a a-up mt-8 max-w-md text-sm text-muted" style={d(560)}>
            Demo on PayPal&apos;s sandbox: log in with a sandbox account. No real money moves.{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">Privacy</Link>
            {" · "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-fg">Terms</Link>
          </p>
        </div>

        {/* What you get after logging in: your tabs, settling themselves */}
        <div className="relative hidden overflow-hidden rounded-[2rem] px-8 py-10 text-white lg:block">
          <div aria-hidden className="a a-wipe absolute inset-0 rounded-[2rem] bg-blue" style={d(200)} />
          <Asterisk className="absolute right-7 top-7 size-20 text-mint" delay={700} />
          <Scribble className="absolute -left-4 bottom-10 w-40 text-white/60" delay={900} />
          <p className="a a-up relative text-sm font-semibold text-white/80" style={d(600)}>My tabs</p>
          <p className="a a-up relative mt-1 text-3xl font-bold" style={d(680)}>Blueleaf Bistro</p>
          <ul className="relative mt-8 max-w-sm space-y-3 text-ink">
            {(
              [
                ["Vattesh", "$22.28", "Paid ✓", 1],
                ["Sam", "$26.04", "Paid ✓", 2],
                ["Priya", "$8.39", "Nudged", 3],
              ] as const
            ).map(([name, amount, status, t], i) => (
              <li key={name} className="a a-up flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl" style={d(800 + i * 140)}>
                <Avatar name={name} tone={TONES[t]} />
                <span className="flex-1 font-semibold">{name}</span>
                <span className="font-bold tabular-nums">{amount}</span>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={status === "Paid ✓" ? { background: TONES[1][0], color: TONES[1][1] } : { background: TONES[5][0], color: TONES[5][1] }}
                >
                  {status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
