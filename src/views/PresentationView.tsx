/**
 * Output stage.
 *
 * Subscribes to `slide:update` and paints one payload: black, a title card,
 * or fitted lyrics on the song's background. Clear hides the words and keeps
 * the background. This view does not read the controller's React state. The
 * top strip is a window drag region. Double-click leaves fullscreen.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import FittedLyrics, { LYRIC_STAGE_INSET, StageTitle } from "../components/FittedLyrics";
import {
  isCustomThemeRecord,
  songThemeId,
  stageSurfaceStyle,
  stageThemeById,
  themeFromRecord,
} from "../lib/stageThemes";
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
  theme: "sanctuary",
  titleSlide: false,
};

export default function PresentationView() {
  const [slide, setSlide] = useState<SlidePayload>(EMPTY);
  const dragStripRef = useRef<HTMLDivElement>(null);
  const theme = useMemo(
    () =>
      slide.customTheme && isCustomThemeRecord(slide.customTheme)
        ? themeFromRecord(slide.customTheme)
        : stageThemeById(songThemeId(slide)),
    [slide],
  );

  useEffect(() => {
    let cancelled = false;
    let unsub = () => {};
    const boot = async () => {
      const api = window.primaVista;
      if (api) {
        // A slide:update can land while getSlide() is in flight. That reply is
        // older than the update, so applying it would paint the previous slide.
        let updateSinceRequest = false;
        unsub = api.onSlideUpdate((payload) => {
          updateSinceRequest = true;
          setSlide(payload);
        });
        const current = await api.getSlide();
        if (!cancelled && !updateSinceRequest) setSlide(current);
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

  useEffect(() => {
    const strip = dragStripRef.current;
    if (!strip) return;
    const onDoubleClick = () => {
      void window.primaVista?.exitPresentationFullscreen();
    };
    strip.addEventListener("dblclick", onDoubleClick);
    return () => strip.removeEventListener("dblclick", onDoubleClick);
  }, []);

  const hidden = slide.blackout || slide.clear || !slide.lines.length;
  const showTitle = Boolean(slide.titleSlide) && !hidden;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={slide.blackout ? { background: "#000000" } : stageSurfaceStyle(theme)}
    >
      <div
        ref={dragStripRef}
        className="absolute inset-x-0 top-0 z-10 h-8 [-webkit-app-region:drag]"
      />
      {theme.frame && !slide.blackout && (
        <div
          className="pointer-events-none absolute inset-[3.5%] border"
          style={{ borderColor: theme.frame }}
        />
      )}
      {slide.blackout ? null : showTitle ? (
        <StageTitle title={slide.songTitle} author={slide.artist} theme={theme} />
      ) : (
        <div
          className={`${LYRIC_STAGE_INSET} transition-opacity duration-200 ${
            hidden ? "opacity-0" : "opacity-100"
          }`}
        >
          <FittedLyrics lines={slide.lines} theme={theme} />
        </div>
      )}
    </div>
  );
}
