"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Asterisk, Scribble, ThemeToggle, Words, d } from "./ui";

export default function NotFound() {
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPlayed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <main className={`grid-lines relative flex flex-1 items-center ${played ? "play" : ""}`}>
      <div className="absolute right-5 top-5 sm:right-8">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <Link href="/" className="a a-up flex w-fit items-center gap-2 text-xl font-bold" style={d(0)}>
            <span className="grid size-9 place-items-center rounded-lg bg-blue text-white">
              <Asterisk className="size-5" />
            </span>
            Tabby
          </Link>
          <p className="a a-up mt-10 text-sm font-semibold text-blue" style={d(100)}>Error 404</p>
          <h1 className="display mt-3 text-[clamp(2.6rem,6vw,5rem)] uppercase">
            <Words lines={["This tab", "doesn't exist."]} delay={150} />
          </h1>
          <p className="a a-up mt-6 max-w-md text-lg leading-relaxed text-muted" style={d(450)}>
            The page you&apos;re looking for isn&apos;t on the bill. It may have moved, or the link has a typo.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/"
              className="a a-pill inline-flex items-center gap-4 rounded-full bg-blue py-1.5 pl-6 pr-1.5 font-semibold text-white transition hover:brightness-110"
              style={d(600)}
            >
              Back to Tabby
              <span className="grid size-10 place-items-center rounded-full bg-white text-blue">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
            <Link href="/tabs" className="a a-up rounded-full border border-line bg-surface px-6 py-3.5 font-semibold hover:border-fg" style={d(700)}>
              My tabs
            </Link>
          </div>
        </div>

        {/* A receipt for the missing page, on the blue panel the rest of the app uses */}
        <div className="relative hidden h-[26rem] overflow-hidden rounded-[2rem] lg:block" aria-hidden>
          <div className="a a-wipe absolute inset-0 rounded-[2rem] bg-blue" style={d(200)} />
          <Asterisk className="absolute right-7 top-7 size-20 text-mint" delay={700} />
          <Scribble className="absolute -left-2 bottom-8 w-40 text-white/60" delay={950} />
          <div className="a a-up absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2" style={d(650)}>
            <div className="rotate-[-6deg] rounded-2xl bg-white p-6 text-sm text-ink shadow-2xl">
              <p className="text-center font-bold tracking-wide">TABBY</p>
              <p className="text-center text-xs text-[#5f6470]">Receipt no. 404</p>
              <div className="mt-4 space-y-2 border-t border-dashed border-black/20 pt-4">
                <p className="flex justify-between">
                  <span>1 x The page you wanted</span>
                  <span>—</span>
                </p>
                <p className="flex justify-between">
                  <span>1 x Working link</span>
                  <span>—</span>
                </p>
              </div>
              <p className="mt-4 flex justify-between border-t border-dashed border-black/20 pt-3 text-base font-bold">
                <span>Total</span>
                <span>Not found</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
