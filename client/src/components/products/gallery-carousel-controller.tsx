import { useEffect, useRef } from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";

/** Enhance the existing image nodes after paint; single-photo products never download Embla. */
export default function GalleryCarouselController({ viewport, dir, initialIndex, onReady }: {
  viewport: HTMLDivElement;
  dir: "rtl" | "ltr";
  initialIndex: number;
  onReady: (api: UseEmblaCarouselType[1]) => void;
}) {
  const startIndex = useRef(initialIndex).current;
  const [setViewport, api] = useEmblaCarousel({
    direction: dir,
    startIndex,
    loop: false,
    align: "start",
    breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
  });
  useEffect(() => { setViewport(viewport); return () => setViewport(null); }, [viewport, setViewport]);
  useEffect(() => { onReady(api); return () => onReady(undefined); }, [api, onReady]);
  return null;
}
