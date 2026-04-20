import "./index.css";
import { Composition } from "remotion";
import { P2Samurai } from "./P2Samurai";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="P2Samurai"
        component={P2Samurai}
        durationInFrames={480}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
