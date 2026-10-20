import { Audio, Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, clamp, EASE, FONT, FPS, INOUT, TONE } from "./theme";

const s = (sec: number) => Math.round(sec * FPS);

// The site's asterisk; `progress` 0..1 draws its four strokes one after another.
export const Asterisk: React.FC<{ size: number; color: string; progress?: number; stroke?: number }> = ({ size, color, progress = 1, stroke = 13 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size}>
    {[90, 0, 45, 135].map((r, i) => (
      <line
        key={r}
        x1="50" y1="8" x2="50" y2="92"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - Math.min(1, Math.max(0, progress * 4 - i))}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        transform={`rotate(${r} 50 50)`}
      />
    ))}
  </svg>
);

// Faint vertical rules, like the site's hero.
export const Grid: React.FC<{ bg: string; line?: string }> = ({ bg, line = C.line }) => (
  <AbsoluteFill style={{ background: bg }}>
    {[480, 960, 1440].map((x) => (
      <div key={x} style={{ position: "absolute", left: x, top: 0, bottom: 0, width: 1.5, background: line }} />
    ))}
  </AbsoluteFill>
);

// A word that rises out of a mask, like the site's .a-word.
export const Word: React.FC<{ children: React.ReactNode; at: number; style?: React.CSSProperties }> = ({ children, at, style }) => {
  const f = useCurrentFrame();
  return (
    <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.08em", ...style }}>
      <span style={{ display: "inline-block", translate: `0 ${interpolate(f, [s(at), s(at + 0.7)], [110, 0], { ...clamp, easing: EASE })}%` }}>
        {children}
      </span>
    </span>
  );
};

export const Avatar: React.FC<{ letter: keyof typeof TONE; size?: number }> = ({ letter, size = 56 }) => (
  <div
    style={{
      width: size, height: size, borderRadius: size, display: "grid", placeItems: "center", flexShrink: 0,
      background: TONE[letter][0], color: TONE[letter][1], fontFamily: FONT, fontWeight: 700, fontSize: size * 0.42,
    }}
  >
    {letter}
  </div>
);

export const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.6 }) => (
  <Sequence from={s(at)} layout="none">
    <Audio src={staticFile(`sfx/${src}.wav`)} volume={volume} />
  </Sequence>
);

export const Callout: React.FC<{ at: number; until: number; text: string }> = ({ at, until, text }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spring({ frame: f - s(at), fps, config: { damping: 16, stiffness: 140 } });
  const out = interpolate(f, [s(until) - 8, s(until)], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute", left: 150, bottom: 88, display: "flex", alignItems: "center", gap: 20,
        background: C.ink, color: "white", borderRadius: 999, padding: "22px 40px 22px 26px",
        fontFamily: FONT, fontWeight: 700, fontSize: 38, letterSpacing: "-0.01em",
        boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
        opacity: Math.min(inP, out), translate: `0 ${(1 - inP) * 40}px`, scale: 0.9 + 0.1 * inP,
      }}
    >
      <Asterisk size={40} color={C.mint} progress={interpolate(f, [s(at), s(at + 0.6)], [0, 1], clamp)} />
      {text}
    </div>
  );
};

// ---- Screen recordings in a browser window, with a simple camera ----
export type Seg = { src: string; from: number; to: number; rate?: number };
export type Key = { t: number; s: number; x: number; y: number }; // focus (x, y) in recording pixels
export const segFrames = (g: Seg) => Math.round(((g.to - g.from) / (g.rate ?? 1)) * FPS);

const W = 1680;
const K = W / 1920;
const H = 1080 * K;
const BAR = 50;
const LEFT = (1920 - W) / 2;
const TOP = (1080 - H - BAR) / 2;

const track = (f: number, keys: Key[], k: "s" | "x" | "y") =>
  keys.length === 1 ? keys[0][k] : interpolate(f, keys.map((q) => s(q.t)), keys.map((q) => q[k]), { ...clamp, easing: INOUT });

export const Screen: React.FC<{ segs: Seg[]; keys: Key[]; url?: string; children?: React.ReactNode }> = ({ segs, keys, url = "tabby-eta-five.vercel.app", children }) => {
  const f = useCurrentFrame();
  const starts = segs.map((_, i) => segs.slice(0, i).reduce((a, g) => a + segFrames(g), 0));
  const cur = segs.findIndex((_, i) => f < starts[i] + segFrames(segs[i]));
  const host = (segs[cur === -1 ? segs.length - 1 : cur].src === "invoice" ? "sandbox.paypal.com/invoice" : url);
  const x = LEFT + track(f, keys, "x") * K;
  const y = TOP + BAR + track(f, keys, "y") * K;
  return (
    <AbsoluteFill>
      <Grid bg={C.canvas} />
      <AbsoluteFill style={{ transformOrigin: `${x}px ${y}px`, scale: track(f, keys, "s") }}>
        <div
          style={{
            position: "absolute", left: LEFT, top: TOP, width: W, height: H + BAR, borderRadius: 26, overflow: "hidden",
            background: C.surface, boxShadow: "0 40px 100px rgba(20,24,60,0.18), 0 0 0 1.5px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ height: BAR, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", background: "#e9eaee" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: 14, height: 14, borderRadius: 14, background: c }} />
            ))}
            <div style={{ marginLeft: 24, flex: 1, maxWidth: 620, height: 32, borderRadius: 10, background: "white", display: "flex", alignItems: "center", padding: "0 16px", fontFamily: FONT, fontSize: 18, color: C.muted }}>
              {host}
            </div>
          </div>
          <div style={{ position: "relative", width: W, height: H }}>
            {segs.map((g, i) => (
              <Sequence key={i} from={starts[i]} durationInFrames={segFrames(g)} layout="absolute-fill">
                <Video src={staticFile(`footage/${g.src}.mp4`)} muted trimBefore={s(g.from)} playbackRate={g.rate ?? 1} style={{ width: W, height: H }} />
              </Sequence>
            ))}
          </div>
        </div>
      </AbsoluteFill>
      {children}
    </AbsoluteFill>
  );
};
