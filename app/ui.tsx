import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { flushSync } from "react-dom";

// Pastel [background, text] pairs; each person keeps one tone on the receipt and in the shares list.
export const TONES = [
  ["#e8ecff", "#3b49f0"],
  ["#dcfbef", "#0f7a55"],
  ["#fff1e6", "#c2410c"],
  ["#fde8f1", "#be185d"],
  ["#f0e9ff", "#6d28d9"],
  ["#fff7d6", "#946200"],
  ["#e0f7fa", "#0e7490"],
  ["#eef0f3", "#374151"],
];

// Animation delay for the motion classes in globals.css.
export const d = (ms: number, extra?: CSSProperties) => ({ "--d": `${ms}ms`, ...extra }) as CSSProperties;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Arms draw in one after another: slash, X, then the full asterisk.
// `delay` plays it on load (CSS); `progress` (0..1) scrubs it from scroll.
export function Asterisk({ className = "", delay, progress }: { className?: string; delay?: number; progress?: number }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      {[90, 0, 45, 135].map((r, i) => (
        <line
          key={r}
          x1="50"
          y1="8"
          x2="50"
          y2="92"
          pathLength={1}
          strokeDasharray={progress === undefined ? undefined : 1}
          strokeDashoffset={progress === undefined ? undefined : 1 - clamp01(progress * 4 - i)}
          className={delay === undefined ? "" : "a a-draw"}
          style={delay === undefined ? undefined : d(delay + i * 130)}
          stroke="currentColor"
          strokeWidth="16"
          strokeLinecap="round"
          transform={`rotate(${r} 50 50)`}
        />
      ))}
    </svg>
  );
}

export function Scribble({ className = "", delay = 0, progress }: { className?: string; delay?: number; progress?: number }) {
  return (
    <svg viewBox="0 0 200 160" fill="none" aria-hidden className={className}>
      <path
        d="M8 150 C 50 120, 70 60, 120 70 S 190 120, 150 40 S 60 30, 110 10"
        pathLength={1}
        strokeDasharray={progress === undefined ? undefined : 1}
        strokeDashoffset={progress === undefined ? undefined : 1 - clamp01(progress)}
        className={progress === undefined ? "a a-draw" : ""}
        style={progress === undefined ? d(delay, { animationDuration: "1400ms" }) : undefined}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Avatar({
  name,
  tone,
  size = "size-9",
  className = "",
  style,
}: {
  name: string;
  tone: string[];
  size?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`${size} grid shrink-0 place-items-center rounded-full text-sm font-bold ring-2 ring-surface ${className}`}
      style={{ background: tone[0], color: tone[1], ...style }}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

const onThemeChange = (cb: () => void) => {
  addEventListener("themechange", cb);
  return () => removeEventListener("themechange", cb);
};
export function ThemeToggle() {
  const dark = useSyncExternalStore(onThemeChange, () => document.documentElement.dataset.theme === "dark", () => false);
  const flip = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = dark ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.theme = next;
      } catch {}
      flushSync(() => dispatchEvent(new Event("themechange"))); // icon must update inside the snapshot
    };
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();

    // The new theme grows as a circle from the button (or its centre when activated by keyboard).
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || box.left + box.width / 2;
    const y = e.clientY || box.top + box.height / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
      ),
    );
  };
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-9 place-items-center rounded-full border border-line hover:border-fg"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        )}
      </svg>
    </button>
  );
}

// Word-by-word reveal used for every big heading.
export function Words({ lines, delay = 0 }: { lines: string[]; delay?: number }) {
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
export function CountUp({ value, format, delay = 0 }: { value: number; format: (v: number) => string; delay?: number }) {
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


// One wording for payout states, shared by the live board and My tabs.
export function payoutText(p: { status: string; to: string }, viewerEmail?: string) {
  const who = viewerEmail && p.to.toLowerCase() === viewerEmail.toLowerCase() ? "your PayPal" : p.to;
  if (p.status === "SUCCESS") return { text: `Forwarded to ${who} ✓`, ok: true };
  if (p.status === "UNCLAIMED") return { text: `Sent to ${who}, waiting to be claimed`, ok: true };
  if (["FAILED", "RETURNED", "BLOCKED", "REFUNDED", "REVERSED", "DENIED"].includes(p.status)) return { text: "Couldn't forward this payment", ok: false };
  return { text: `Forwarding to ${who}…`, ok: true };
}
