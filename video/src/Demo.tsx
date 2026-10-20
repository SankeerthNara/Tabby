import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import React from "react";
import { interpolate, Sequence, staticFile } from "remotion";
import { ColdOpen, Outro, Title, UnderTheHood } from "./Motion";
import { SAY_VOICE_AT, Shot, shotFrames } from "./Screens";
import { clamp, FPS } from "./theme";

const T = 12; // transition length in frames
const s = (sec: number) => Math.round(sec * FPS);

// A line of audio placed in a scene: `at` is seconds into the scene; from/to trim the clip (seconds). `len` = played length.
type Line = { src: string; at: number; len: number; from?: number; to?: number; voice?: boolean };
type Scene = { el: React.ReactNode; frames: number; enter?: "slide" | "fade"; vo: Line[] };

// Screen shots cut straight into each other (the footage is continuous, and crossfading two similar
// screens ghosts the text). Fades and slides only where an animated scene meets the footage.
const SCENES: Scene[] = [
  { el: <ColdOpen />, frames: s(9.5), vo: [{ src: "vo/01.mp3", at: 0.4, len: 8.16 }] },
  { el: <Title />, frames: s(6.5), enter: "slide", vo: [{ src: "vo/02.mp3", at: 0.4, len: 5.6 }] },
  { el: <Shot name="login" />, frames: shotFrames("login"), enter: "fade", vo: [{ src: "vo/03.mp3", at: 0.4, len: 2.8 }] },
  { el: <Shot name="snap" />, frames: shotFrames("snap"), vo: [{ src: "vo/04.mp3", at: 0.4, len: 5.12 }] },
  { el: <Shot name="type" />, frames: shotFrames("type"), vo: [{ src: "vo/05.mp3", at: 0.3, len: 14.0 }] },
  {
    el: <Shot name="say" />,
    frames: shotFrames("say"),
    vo: [
      { src: "vo/05b.mp3", at: 1.0, len: 2.95, to: 2.95 }, // "Rather talk? Just tap Say it."
      { src: "vo/user_say.mp3", at: SAY_VOICE_AT, len: 4.08, voice: true }, // you, speaking into the app
      { src: "vo/05b.mp3", at: 9.8, len: 4.44, from: 3.0 }, // "Tabby even understands corrections."
    ],
  },
  { el: <Shot name="edit" />, frames: shotFrames("edit"), vo: [{ src: "vo/06.mp3", at: 0.2, len: 5.76 }] },
  { el: <Shot name="send" />, frames: shotFrames("send"), vo: [{ src: "vo/07.mp3", at: 0.4, len: 8.08 }] },
  { el: <Shot name="paid" />, frames: shotFrames("paid"), vo: [{ src: "vo/08.mp3", at: 0.3, len: 8.0 }] },
  { el: <Shot name="tabs" />, frames: shotFrames("tabs"), vo: [{ src: "vo/09.mp3", at: 0.6, len: 6.4 }] },
  { el: <UnderTheHood />, frames: s(13.5), enter: "slide", vo: [{ src: "vo/10.mp3", at: 0.4, len: 11.2 }] },
  { el: <Outro />, frames: s(6.5), enter: "fade", vo: [{ src: "vo/11.mp3", at: 0.4, len: 4.32 }] },
];

const starts: number[] = [];
SCENES.forEach((sc, i) => starts.push(i === 0 ? 0 : starts[i - 1] + SCENES[i - 1].frames - (sc.enter ? T : 0)));
export const DEMO_FRAMES = starts[starts.length - 1] + SCENES[SCENES.length - 1].frames;

const LINES = SCENES.flatMap((sc, i) => sc.vo.map((l) => ({ ...l, start: starts[i] + s(l.at) })));
const MUSIC_AT = 0;
// The bed is 110 s; play it a touch slower so its ending lands on the outro whatever the cut length.
const MUSIC_RATE = 110 / (DEMO_FRAMES / FPS);

// Music sits under the voices and comes up between lines and at the end.
const musicVolume = (f: number) => {
  const g = f + MUSIC_AT; // volume callback frames are relative to the music's own start
  const duck = Math.max(...LINES.map((l) => interpolate(g, [l.start - 8, l.start, l.start + s(l.len), l.start + s(l.len) + 10], [0, 1, 1, 0], clamp)));
  const fades = interpolate(g, [MUSIC_AT, MUSIC_AT + FPS, DEMO_FRAMES - 2 * FPS, DEMO_FRAMES], [0, 1, 1, 0], clamp);
  return (0.3 - 0.2 * duck) * fades;
};

export const Demo: React.FC = () => (
  <>
    <TransitionSeries>
      {SCENES.flatMap((sc, i) => [
        ...(sc.enter
          ? [
              <TransitionSeries.Transition
                key={`t${i}`}
                presentation={sc.enter === "slide" ? slide({ direction: "from-bottom" }) : fade()}
                timing={linearTiming({ durationInFrames: T })}
              />,
            ]
          : []),
        <TransitionSeries.Sequence key={`s${i}`} durationInFrames={sc.frames}>
          {sc.el}
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
    {LINES.map((l, i) => (
      <Sequence key={i} from={l.start} durationInFrames={s(l.len)} layout="none">
        <Audio src={staticFile(l.src)} trimBefore={l.from ? s(l.from) : undefined} trimAfter={l.to ? s(l.to) : undefined} volume={l.voice ? 0.9 : 1} />
      </Sequence>
    ))}
    <Sequence from={MUSIC_AT} layout="none">
      <Audio src={staticFile("music.mp3")} volume={musicVolume} playbackRate={MUSIC_RATE} />
    </Sequence>
  </>
);
