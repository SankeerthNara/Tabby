import type { CSSProperties } from "react";

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
      className={`${size} grid shrink-0 place-items-center rounded-full text-sm font-bold ring-2 ring-white ${className}`}
      style={{ background: tone[0], color: tone[1], ...style }}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
