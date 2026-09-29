import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SlidePayload } from "../types";

/** Target font size as a fraction of the lyric area width (scales with window resize). */
const FONT_WIDTH_RATIO = 0.058;
const MIN_FONT_PX = 28;
const MAX_FONT_PX = 120;

function fontSizeForWidth(contentWidth: number) {
  if (contentWidth <= 0) return MIN_FONT_PX;
  return Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, contentWidth * FONT_WIDTH_RATIO));
}

const EMPTY: SlidePayload = {
  songTitle: "",
  artist: "",
  sectionLabel: "",
  lines: [],
  index: 0,
  total: 0,
  blackout: true,
  clear: false,
};

export default function PresentationView() {
  const [slide, setSlide] = useState<SlidePayload>(EMPTY);
  const [fontSizePx, setFontSizePx] = useState(MIN_FONT_PX);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let unsub = () => {};
    const boot = async () => {
      const api = window.primaVista;
      if (api) {
        unsub = api.onSlideUpdate(setSlide);
        const current = await api.getSlide();
        if (!cancelled) setSlide(current);
        return;
      }
      setSlide({
        songTitle: "Prima Vista",
        artist: "Presentation Mode",
        sectionLabel: "Ready",
        lines: ["Connect to controller", "to begin presentation"],
        index: 0,
        total: 1,
        blackout: false,
        clear: false,
      });
    };
    void boot();
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const sync = () => {
      setFontSizePx(fontSizeForWidth(stage.clientWidth));
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [slide.blackout]);

  const hidden = slide.blackout || slide.clear || !slide.lines.length;

  return (
    <div className="lyric-stage relative h-full w-full overflow-hidden text-white">
      <div className="absolute inset-x-0 top-0 z-10 h-8 [-webkit-app-region:drag]" />
      {slide.blackout ? (
        <div className="h-full w-full bg-black" />
      ) : (
        <div
          ref={stageRef}
          className="flex h-full w-full flex-col items-center justify-center px-[max(1.25rem,3vw)] py-[10vh]"
        >
          <div
            className={`w-full min-w-0 text-center transition-opacity duration-200 ${
              hidden ? "opacity-0" : "opacity-100"
            }`}
          >
            <p
              className="mx-auto w-full max-w-full font-display font-medium tracking-wide drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)]"
              style={{
                fontSize: `${fontSizePx}px`,
                lineHeight: 1.22,
              }}
            >
              {slide.lines.map((line, index) => (
                <span key={`${index}-${line}`} className="block max-w-full break-words">
                  {line}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
