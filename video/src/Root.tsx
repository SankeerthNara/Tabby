import { Composition } from "remotion";
import { Demo, DEMO_FRAMES } from "./Demo";
import { FPS } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition id="TabbyDemo" component={Demo} durationInFrames={DEMO_FRAMES} fps={FPS} width={1920} height={1080} />
);
