import { continueRender, delayRender, Easing, staticFile } from "remotion";

export const FPS = 30;
export const C = {
  canvas: "#f2f3f5",
  ink: "#000000",
  night: "#0d0e12",
  muted: "#5f6470",
  blue: "#3b49f0",
  mint: "#5cf2c0",
  surface: "#ffffff",
  line: "rgba(0,0,0,0.08)",
};
// Avatar tones from the site (app/ui.tsx TONES).
export const TONE = {
  S: ["#e6e8ff", "#3b49f0"],
  J: ["#dcfbef", "#0f7a55"],
  P: ["#fde7ef", "#c0265e"],
} as const;

export const FONT = "Archivo, Arial, sans-serif";
export const MONO = "'Cascadia Mono', Consolas, Archivo, monospace";
// The site's display style: Archivo at 125% width, extra bold.
export const display = { fontFamily: FONT, fontStretch: "125%", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 } as const;

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const INOUT = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Same variable Archivo files Next serves for the site (latin-ext carries ₹), with the same unicode ranges.
// Without the ranges, parallel render tabs could take a character (notably the space) from different files,
// so word gaps jumped between frames.
const FACES = [
  ["archivo-latin.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"],
  ["archivo-latin-ext.woff2", "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF"],
];
const handle = delayRender("Loading Archivo");
Promise.all(
  FACES.map(([f, unicodeRange]) => {
    const face = new FontFace("Archivo", `url(${staticFile(`fonts/${f}`)}) format("woff2")`, { weight: "100 900", stretch: "62% 125%", unicodeRange });
    return face.load().then((loaded) => document.fonts.add(loaded));
  }),
).then(() => continueRender(handle));
