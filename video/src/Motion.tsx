// The animated scenes: cold open, title, under the hood, outro.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, clamp, display, EASE, FONT, FPS, MONO } from "./theme";
import { Asterisk, Avatar, Grid, Sfx, Word } from "./ui";

const s = (sec: number) => Math.round(sec * FPS);

const RECEIPT: [string, string][] = [
  ["1 x Classic Cheeseburger", "$16.50"],
  ["3 x Fish Tacos", "$15.75"],
  ["2 x Truffle Fries", "$16.00"],
  ["1 x Caesar Salad", "$12.00"],
  ["2 x Mango Lemonade", "$9.00"],
  ["1 x Craft Root Beer", "$4.00"],
];

const Bubble: React.FC<{ at: number; who: "J" | "P"; text: string; style: React.CSSProperties; flip?: boolean }> = ({ at, who, text, style, flip }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - s(at), fps, config: { damping: 12, stiffness: 160 } });
  return (
    <div style={{ position: "absolute", display: "flex", flexDirection: flip ? "row-reverse" : "row", alignItems: "flex-end", gap: 16, opacity: Math.min(1, p * 1.5), scale: 0.6 + 0.4 * p, transformOrigin: flip ? "right bottom" : "left bottom", ...style }}>
      <Avatar letter={who} size={64} />
      <div style={{ background: "white", color: C.ink, fontFamily: FONT, fontWeight: 600, fontSize: 40, padding: "22px 32px", borderRadius: 34, [flip ? "borderBottomRightRadius" : "borderBottomLeftRadius"]: 8, boxShadow: "0 20px 50px rgba(0,0,0,0.35)" }}>
        {text}
      </div>
    </div>
  );
};

export const ColdOpen: React.FC = () => {
  const f = useCurrentFrame();
  const print = interpolate(f, [s(0.3), s(3.0)], [0, 1], { ...clamp, easing: EASE });
  const total = interpolate(f, [s(3.0), s(3.6)], [0, 1], { ...clamp, easing: EASE });
  const push = interpolate(f, [s(7.6), s(9.5)], [1, 1.12], { ...clamp, easing: EASE });
  const row = { display: "flex", justifyContent: "space-between", gap: 24 } as const;
  return (
    <AbsoluteFill>
      <Grid bg={C.night} line="rgba(255,255,255,0.05)" />
      <AbsoluteFill style={{ scale: push }}>
        {/* Receipt feeds down out of a printer slot */}
        <div style={{ position: "absolute", left: 960 - 330, top: 70, width: 660, height: 980, overflow: "hidden" }}>
          <div
            style={{
              translate: `0 ${(print - 1) * 100}%`, rotate: "-1.5deg", margin: "0 20px", background: "#fbfaf6", color: "#111",
              fontFamily: MONO, fontSize: 25, lineHeight: 1.55, padding: "44px 40px 56px", borderRadius: "4px 4px 14px 14px",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 38 }}>Harbor &amp; Pine Kitchen</div>
            <div style={{ textAlign: "center", color: "#555" }}>214 Market St, San Francisco</div>
            <div style={{ borderTop: "2px dashed #aaa", margin: "18px 0" }} />
            {RECEIPT.map(([n, p]) => (
              <div key={n + p} style={row}><span>{n}</span><span>{p}</span></div>
            ))}
            <div style={{ borderTop: "2px dashed #aaa", margin: "18px 0" }} />
            <div style={row}><span>SUBTOTAL</span><span>$73.25</span></div>
            <div style={row}><span>SALES TAX (8.625%)</span><span>$6.32</span></div>
            <div style={{ ...row, color: "#555" }}><span>TIP</span><span>________</span></div>
            <div style={{ ...row, position: "relative", fontWeight: 700, fontSize: 34, marginTop: 10 }}>
              <div style={{ position: "absolute", left: -12, right: -12, top: 2, bottom: 0, background: C.mint, borderRadius: 8, scale: `${total} 1`, transformOrigin: "left" }} />
              <span style={{ position: "relative" }}>TOTAL</span><span style={{ position: "relative" }}>$79.57</span>
            </div>
            <div style={{ textAlign: "center", marginTop: 26, color: "#555" }}>THANK YOU. SEE YOU AGAIN SOON!</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 960 - 370, top: 56, width: 740, height: 24, borderRadius: 12, background: "#24262d" }} />

        <Bubble at={2.6} who="J" text="who had the tacos??" style={{ left: 120, top: 250 }} />
        <Bubble at={4.4} who="J" text="wait, did we tip? 🤔" style={{ right: 110, top: 470 }} flip />
        <Bubble at={6.4} who="P" text="I'll pay you later 🙏" style={{ left: 170, top: 760 }} />
      </AbsoluteFill>
      <Sfx at={0.3} src="page-turn" volume={0.35} />
      <Sfx at={2.6} src="snapchat-notification" volume={0.35} />
      <Sfx at={4.4} src="snapchat-notification" volume={0.35} />
      <Sfx at={6.4} src="snapchat-notification" volume={0.35} />
    </AbsoluteFill>
  );
};

export const Logo: React.FC<{ size: number; color?: string; tile?: string; ink?: string }> = ({ size, color = "white", tile = C.blue, ink = "white" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.32 }}>
    <div style={{ width: size, height: size, borderRadius: size * 0.24, background: tile, display: "grid", placeItems: "center" }}>
      <Asterisk size={size * 0.56} color={ink} />
    </div>
    <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: size * 0.78, color }}>Tabby</span>
  </div>
);

export const Title: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: f - s(0.4), fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: C.blue }}>
      <Grid bg={C.blue} line="rgba(255,255,255,0.08)" />
      <div style={{ position: "absolute", right: 150, top: 170, rotate: `${interpolate(f, [0, s(6.5)], [0, 40])}deg` }}>
        <Asterisk size={330} color={C.mint} progress={interpolate(f, [s(0.6), s(1.8)], [0, 1], { ...clamp, easing: EASE })} />
      </div>
      <div style={{ position: "absolute", left: 160, top: 150, opacity: logo, translate: `0 ${(1 - logo) * 30}px` }}>
        <Logo size={88} tile="white" ink={C.blue} />
      </div>
      <div style={{ ...display, position: "absolute", left: 150, top: 330, color: "white", fontSize: 196, textTransform: "uppercase" }}>
        <div><Word at={1.2}>Snap</Word> <Word at={1.35}>it.</Word></div>
        <div><Word at={2.1}>Say</Word> <Word at={2.25}>it.</Word></div>
        <div style={{ color: C.mint }}><Word at={3.3}>Settled.</Word></div>
      </div>
      <Sfx at={0} src="whoosh" volume={0.5} />
    </AbsoluteFill>
  );
};

const Node: React.FC<{ at: number; x: number; w: number; tone: "white" | "blue" | "black"; kicker: string; title: string; lines: string[] }> = ({ at, x, w, tone, kicker, title, lines }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - s(at), fps, config: { damping: 15, stiffness: 120 } });
  const bg = { white: C.surface, blue: C.blue, black: C.ink }[tone];
  const fg = tone === "white" ? C.ink : "white";
  return (
    <div
      style={{
        position: "absolute", left: x, top: 330, width: w, minHeight: 330, borderRadius: 36, background: bg, color: fg, padding: "38px 36px",
        boxShadow: "0 30px 70px rgba(20,24,60,0.12)", opacity: Math.min(1, p * 1.4), translate: `0 ${(1 - p) * 60}px`, fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>{kicker}</div>
      <div style={{ ...display, fontSize: 52, marginTop: 14 }}>{title}</div>
      <div style={{ marginTop: 22, fontSize: 27, lineHeight: 1.4, opacity: tone === "white" ? 0.7 : 0.85 }}>
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
    </div>
  );
};

const Arrow: React.FC<{ at: number; x: number }> = ({ at, x }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [s(at), s(at + 0.45)], [0, 1], { ...clamp, easing: EASE });
  return (
    <svg style={{ position: "absolute", left: x, top: 470 }} width={64} height={50} viewBox="0 0 64 50">
      <path d="M4 25 H54 M40 10 L56 25 L40 40" fill="none" stroke={C.blue} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
    </svg>
  );
};

const Badge: React.FC<{ at: number; text: string; dark?: boolean }> = ({ at, text, dark }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f - s(at), fps, config: { damping: 11, stiffness: 170 } });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: dark ? C.ink : C.mint, color: dark ? "white" : C.ink, borderRadius: 999, padding: "18px 30px", fontFamily: FONT, fontWeight: 700, fontSize: 32, opacity: Math.min(1, p * 1.5), scale: 0.5 + 0.5 * p }}>
      <span style={{ width: 12, height: 12, borderRadius: 12, background: dark ? C.mint : C.ink }} />
      {text}
    </div>
  );
};

export const UnderTheHood: React.FC = () => {
  const o = 0.4; // voice starts here
  return (
    <AbsoluteFill>
      <Grid bg={C.canvas} />
      <div style={{ ...display, position: "absolute", left: 150, top: 120, fontSize: 104 }}>
        <Word at={o}>Under</Word> <Word at={o + 0.12}>the</Word> <Word at={o + 0.24}>hood</Word>
      </div>
      <Node at={o + 0.9} x={150} w={350} tone="white" kicker="You" title="Photo + words" lines={["The receipt", "“John had 2 of the 3 tacos…”"]} />
      <Arrow at={o + 1.5} x={512} />
      <Node at={o + 1.7} x={590} w={390} tone="blue" kicker="AI" title="Gemini" lines={["Reads every line", "Understands who had what", "Asks if unsure"]} />
      <Arrow at={o + 3.9} x={992} />
      <Node at={o + 4.1} x={1070} w={330} tone="white" kicker="Code" title="The math" lines={["Exact to the cent", "Tax and tip, fairly", "Unit tested"]} />
      <Arrow at={o + 5.6} x={1412} />
      <Node at={o + 5.8} x={1490} w={280} tone="black" kicker="Money" title="PayPal" lines={["Does the rest"]} />
      <div style={{ position: "absolute", left: 150, right: 150, top: 760, display: "flex", gap: 22, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <Badge at={o + 7.4} text="Log in with PayPal" />
        <Badge at={o + 8.0} text="Invoicing" />
        <Badge at={o + 8.6} text="Reminders" />
        <Badge at={o + 9.3} text="Payouts" />
        <Badge at={o + 9.9} text="Any currency" />
      </div>
      <div style={{ position: "absolute", left: 150, right: 150, top: 870, display: "flex", gap: 22, justifyContent: "flex-end", alignItems: "center" }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, opacity: interpolate(useCurrentFrame(), [s(o + 10.3), s(o + 10.8)], [0, 1], clamp) }}>Built with</span>
        <Badge at={o + 10.5} text="AG Grid: review grid + ledger" dark />
        <Badge at={o + 11.0} text="Render: webhooks + daily reminders" dark />
      </div>
    </AbsoluteFill>
  );
};

export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: f - s(0.3), fps, config: { damping: 13 } });
  const pill = spring({ frame: f - s(3.9), fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: C.blue }}>
      <Grid bg={C.blue} line="rgba(255,255,255,0.08)" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ scale: 0.6 + 0.4 * logo, opacity: logo }}>
          <Logo size={150} tile="white" ink={C.blue} />
        </div>
        <div style={{ ...display, color: "white", fontSize: 96, marginTop: 70, textTransform: "uppercase" }}>
          <Word at={1.3}>Snap it.</Word> <Word at={2.0}>Say it.</Word> <Word at={2.8} style={{ color: C.mint }}>Settled.</Word>
        </div>
        <div style={{ marginTop: 70, background: "white", color: C.blue, borderRadius: 999, padding: "22px 44px", fontFamily: FONT, fontWeight: 700, fontSize: 40, opacity: pill, translate: `0 ${(1 - pill) * 30}px` }}>
          tabby-eta-five.vercel.app
        </div>
        <div style={{ marginTop: 34, color: "rgba(255,255,255,0.75)", fontFamily: FONT, fontSize: 28, opacity: pill }}>Built with Gemini and PayPal</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
