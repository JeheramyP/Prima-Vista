import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  buildCustomTheme,
  isCustomThemeRecord,
  songThemeId,
  stageLyricStyle,
  stageMutedColor,
  stageSurfaceStyle,
  stageThemeById,
} from "../lib/stageThemes";
import type { SlidePayload } from "../types";

/** Target font size as a fraction of the lyric area width (scales with window resize). */
const FONT_WIDTH_RATIO = 0.058;
const MIN_FONT_PX = 28;
const MAX_FONT_PX = 120;

function fontSizeForWidth(contentWidth: number) {
  if (contentWidth <= 0) return MIN_FONT_PX;
  return Math.min(MAX_FONT_PX, Math.max(MIN_FONT_PX, contentWidth * FONT_WIDTH_RATIO));
}

function titleFontSize(lyricPx: number, title: string) {
  const length = title.trim().length;
  const scale = length > 32 ? 0.68 : length > 20 ? 0.82 : 1;
  return Math.min(168, Math.max(44, lyricPx * 1.65 * scale));
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
  theme: "sanctuary",
  titleSlide: false,
};

export default function PresentationView() {
  const [slide, setSlide] = useState<SlidePayload>(EMPTY);
  const theme = useMemo(
    () =>
      slide.customTheme && isCustomThemeRecord(slide.customTheme)
        ? buildCustomTheme(slide.customTheme)
        : stageThemeById(songThemeId(slide)),
    [slide],
  );
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
        theme: "sanctuary",
        titleSlide: false,
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
  const showTitle = Boolean(slide.titleSlide) && !hidden;
  const titleSize = titleFontSize(fontSizePx, slide.songTitle);
  const authorSize = Math.max(20, Math.round(titleSize * 0.28));

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={slide.blackout ? { background: "#000000" } : stageSurfaceStyle(theme)}
    >
      <div className="absolute inset-x-0 top-0 z-10 h-8 [-webkit-app-region:drag]" />
      {theme.frame && !slide.blackout && (
        <div
          className="pointer-events-none absolute inset-[3.5vmin] border"
          style={{ borderColor: theme.frame }}
        />
      )}
      {slide.blackout ? null : (
        <div ref={stageRef} className="relative h-full w-full">
          {showTitle ? (
            <div className="flex h-full w-full flex-col px-[max(2rem,8vw)] pb-[max(1.5rem,6.5vmin)] pt-[max(2rem,8vmin)]">
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <p className="max-w-[14ch] text-center" style={stageLyricStyle(theme, titleSize)}>
                  {slide.songTitle}
                </p>
              </div>
              {slide.artist.trim() && (
                <p
                  className="max-w-[58%] shrink-0 self-end text-right"
                  style={{
                    ...stageLyricStyle(theme, authorSize),
                    color: stageMutedColor(theme),
                    fontWeight: 400,
                  }}
                >
                  {slide.artist}
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center px-[max(1.25rem,3vw)] py-[10vh]">
              <div
                className={`w-full min-w-0 text-center transition-opacity duration-200 ${
                  hidden ? "opacity-0" : "opacity-100"
                }`}
              >
                <p className="mx-auto w-full max-w-full" style={stageLyricStyle(theme, fontSizePx)}>
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
      )}
    </div>
  );
}
