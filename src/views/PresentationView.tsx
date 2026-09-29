import { useEffect, useState } from "react";
import type { SlidePayload } from "../types";

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

  useEffect(() => {
    let unsub = () => {};
    const boot = async () => {
      if (window.primaVista) {
        const current = await window.primaVista.getSlide();
        setSlide(current);
        unsub = window.primaVista.onSlideUpdate(setSlide);
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
    return () => unsub();
  }, []);

  const hidden = slide.blackout || slide.clear || !slide.lines.length;

  return (
    <div className="lyric-stage relative h-full w-full overflow-hidden text-white">
      <div className="absolute inset-x-0 top-0 z-10 h-8 [-webkit-app-region:drag]" />
      {slide.blackout ? (
        <div className="h-full w-full bg-black" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-[8vw] py-[10vh]">
          <div
            className={`w-full max-w-[56rem] text-center transition-opacity duration-200 ${
              hidden ? "opacity-0" : "opacity-100"
            }`}
          >
            <p className="font-display text-[clamp(2rem,4.8vw,5.6rem)] font-medium leading-[1.22] tracking-wide drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)]">
              {slide.lines.map((line, index) => (
                <span key={`${index}-${line}`} className="block px-4">
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
