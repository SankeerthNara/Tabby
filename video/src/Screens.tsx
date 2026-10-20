// The real product footage, scene by scene. Times are seconds in the recordings (D:\tabbytest\rec_us.py marks;
// footage is 2880x1620, camera focus points are in 1920x1080 units).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, clamp, EASE, FONT, FPS } from "./theme";
import { Callout, Key, Screen, Seg, segFrames, Sfx } from "./ui";

type Shot = { segs: Seg[]; keys: Key[]; callouts: { at: number; until: number; text: string }[]; sfx: { at: number; src: string; volume?: number }[] };
const app = (from: number, to: number, rate?: number): Seg => ({ src: "app", from, to, rate });
const FULL = { s: 1, x: 960, y: 540 };
const click = (at: number) => ({ at, src: "mouse-click", volume: 0.4 });

// Say it: the tap lands 4.0 s into the scene; the voice clip starts 0.4 s later (rec_us.py MIC_DELAY).
export const SAY_TAP = 4.0;
export const SAY_VOICE_AT = SAY_TAP + 0.4;
// Spoken words with the time each is said, relative to the voice clip (from rec_us.py word_times, minus its delays).
const SPOKEN: [string, number][] = (() => {
  const out: [string, number][] = [];
  for (const [text, a, b] of [["Oh wait, John had one of the lemonades, not Priya.", 0.16, 2.11], ["And make the tip 20%.", 2.78, 3.95]] as const) {
    const words = text.split(" ");
    const total = words.reduce((n, w) => n + w.length + 1, 0);
    let acc = 0;
    for (const w of words) {
      acc += w.length + 1;
      out.push([w, a + ((b - a) * acc) / total - 0.15]);
    }
  }
  return out;
})();

export const SHOTS = {
  login: {
    segs: [{ src: "login", from: 4.2, to: 9.6 }],
    keys: [{ t: 0, ...FULL }, { t: 1.4, ...FULL }, { t: 2.8, s: 1.3, x: 430, y: 780 }, { t: 3.95, s: 1.3, x: 430, y: 780 }, { t: 4.05, s: 1.2, x: 960, y: 420 }],
    callouts: [{ at: 0.6, until: 5.3, text: "Log in with PayPal. No new password." }],
    sfx: [click(3.5)],
  },
  snap: {
    // Starts after the scroll into the split section lands (the capture drops frames mid-scroll); Gemini's read is sped up.
    segs: [app(7.0, 8.2), app(8.2, 14.0, 2.5), app(14.0, 17.0)],
    keys: [{ t: 0, ...FULL }, { t: 3.7, ...FULL }, { t: 4.8, s: 1.45, x: 418, y: 600 }],
    callouts: [{ at: 4.0, until: 6.4, text: "Gemini reads every line" }],
    sfx: [click(0.6), { at: 0.8, src: "shutter-modern", volume: 0.5 }],
  },
  type: {
    segs: [app(17.0, 20.4), app(20.4, 27.4, 2), app(27.4, 29.0), app(29.0, 35.0, 2.5), app(35.0, 38.4)],
    keys: [
      { t: 0, s: 1.45, x: 418, y: 600 }, { t: 0.5, s: 1.35, x: 1000, y: 430 }, { t: 2.9, s: 1.35, x: 1000, y: 430 },
      { t: 3.5, s: 1.35, x: 960, y: 900 }, { t: 7.5, s: 1.35, x: 960, y: 900 }, { t: 8.3, ...FULL }, { t: 11.4, ...FULL }, { t: 12.3, s: 1.55, x: 420, y: 470 },
    ],
    callouts: [{ at: 11.7, until: 14.2, text: "Split by quantity. Tax and tip shared fairly." }],
    sfx: [click(0.3), click(1.5), click(8.1)],
  },
  say: {
    // Slow-motion approach so the narrator can introduce it before you speak; then real time while you talk.
    segs: [app(38.4, 39.6, 0.3), app(39.6, 44.5), app(44.5, 52.2, 3), app(52.2, 55.6)],
    keys: [{ t: 0, s: 1.55, x: 420, y: 470 }, { t: 0.6, ...FULL }, { t: 1.8, s: 1.4, x: 1000, y: 860 }, { t: 11.0, s: 1.4, x: 1000, y: 860 }, { t: 11.8, ...FULL }],
    callouts: [{ at: 11.9, until: 14.8, text: "Just say it. Tabby understands corrections." }],
    sfx: [click(SAY_TAP), click(9.37), click(9.8)],
  },
  edit: {
    // The AG Grid review step: Priya skipped the fries, so her cell goes to 0 and "Each pays" re-splits.
    segs: [app(56.1, 62.1)],
    keys: [{ t: 0, s: 1.3, x: 960, y: 330 }, { t: 3.1, s: 1.3, x: 960, y: 330 }, { t: 3.8, s: 1.45, x: 1250, y: 560 }],
    callouts: [{ at: 0.5, until: 5.9, text: "AI misread something? Fix it right in the grid" }],
    sfx: [click(1.9), { at: 3.1, src: "mouse-click", volume: 0.25 }],
  },
  send: {
    segs: [app(63.0, 68.6), { src: "invoice", from: 8.8, to: 12.8 }],
    keys: [{ t: 0, ...FULL }, { t: 3.9, ...FULL }, { t: 4.6, s: 1.5, x: 1500, y: 520 }, { t: 5.55, s: 1.5, x: 1500, y: 520 }, { t: 5.6, s: 1.45, x: 560, y: 480 }, { t: 9.6, s: 1.5, x: 560, y: 480 }],
    callouts: [
      { at: 3.9, until: 5.55, text: "Every friend gets a PayPal request" },
      { at: 6.0, until: 9.5, text: "Itemized invoice: every line, plus tax and tip" },
    ],
    sfx: [click(1.1), { at: 1.2, src: "whoosh", volume: 0.5 }, { at: 5.6, src: "page-turn", volume: 0.4 }],
  },
  paid: {
    segs: [app(68.6, 75.6, 2), app(75.6, 80.3)],
    keys: [{ t: 0, s: 1.6, x: 1500, y: 500 }],
    callouts: [{ at: 4.6, until: 8.1, text: "Paid, then forwarded to you with PayPal Payouts" }],
    sfx: [{ at: 4.2, src: "ding", volume: 0.45 }],
  },
  tabs: {
    // My tabs (its loading skeleton sped up), then a cut to the Ledger clip (scrolled so the whole AG Grid shows),
    // then back for Friends + dark mode.
    segs: [app(81.8, 83.6), app(83.6, 85.3, 3), app(85.3, 87.2), app(87.2, 98.6, 4), app(98.6, 99.8), { src: "ledger", from: 10.95, to: 19.4, rate: 1.5 }, app(102.2, 105.5, 2), app(105.5, 107.6)],
    keys: [{ t: 0, ...FULL }, { t: 8.27, s: 1.04, x: 960, y: 540 }, { t: 8.33, ...FULL }, { t: 13.9, s: 1.06, x: 960, y: 600 }, { t: 13.97, ...FULL }],
    callouts: [
      { at: 1.8, until: 8.2, text: "Who owes you, what you owe, one-tap nudges" },
      { at: 8.6, until: 13.9, text: "Every request in one AG Grid ledger. Search it, export it." },
    ],
    sfx: [click(1.2), ...[4.57, 5.27, 5.94, 6.47, 7.33].map((at) => ({ at, src: "mouse-click", volume: 0.3 })), { at: 14.12, src: "mouse-click", volume: 0.3 }, { at: 15.93, src: "switch", volume: 0.5 }],
  },
} satisfies Record<string, Shot>;

export const shotFrames = (k: keyof typeof SHOTS) => SHOTS[k].segs.reduce((a, g) => a + segFrames(g), 0);

// Live caption of what you say, word by word, like the transcript filling in.
const SpeechCaption: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS - SAY_VOICE_AT;
  const shown = interpolate(f, [(SAY_VOICE_AT - 0.2) * FPS, SAY_VOICE_AT * FPS, 9.4 * FPS, 9.8 * FPS], [0, 1, 1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute", left: "50%", top: 70, translate: `-50% ${(shown - 1) * 30}px`, opacity: shown, maxWidth: 1300,
        display: "flex", alignItems: "center", gap: 22, background: "white", borderRadius: 36, padding: "26px 40px",
        boxShadow: "0 24px 70px rgba(20,24,60,0.25)", fontFamily: FONT, fontSize: 40, fontWeight: 600, color: C.ink,
      }}
    >
      <span style={{ width: 22, height: 22, borderRadius: 22, background: "#e5484d", flexShrink: 0, opacity: 0.55 + 0.45 * Math.abs(Math.sin(f / 6)) }} />
      <span>
        {SPOKEN.map(([w, at], i) => (
          <span key={i} style={{ opacity: interpolate(t, [at - 0.12, at + 0.05], [0.18, 1], { ...clamp, easing: EASE }) }}>{w} </span>
        ))}
      </span>
    </div>
  );
};

export const Shot: React.FC<{ name: keyof typeof SHOTS }> = ({ name }) => {
  const { segs, keys, callouts, sfx } = SHOTS[name] as Shot;
  return (
    <Screen segs={segs} keys={keys}>
      {name === "say" && <SpeechCaption />}
      {callouts.map((c) => (
        <Callout key={c.text} {...c} />
      ))}
      {sfx.map((x, i) => (
        <Sfx key={i} {...x} />
      ))}
    </Screen>
  );
};
