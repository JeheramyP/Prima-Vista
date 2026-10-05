/**
 * Current and next stage previews.
 *
 * Uses the same inset and title layout as the output window. The next card
 * is the following slide, or the next setlist song's title slide when this
 * song is finished. Blackout and clear empty the current card.
 *
 * The pair stays 16:9 and side by side. Width is capped so a laptop is not
 * stuck with full-column previews, and the size slider or the right-edge
 * grip changes that width. The choice is stored on this computer.
 */
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import FittedLyrics, { LYRIC_STAGE_INSET, StageTitle } from "./FittedLyrics";
import {
  songThemeId,
  stageEdgeColor,
  stageMutedColor,
  stageSurfaceStyle,
  stageThemeById,
  type StageTheme,
} from "../lib/stageThemes";
import { usePresentation } from "../state/PresentationContext";

const PREVIEW_WIDTH_KEY = "prima-vista-preview-width";
/** Narrowest pair that still leaves two readable 16:9 cards. */
const MIN_PREVIEW_WIDTH = 420;
/** Starting width. Shorter than a full controller column on a laptop. */
const DEFAULT_PREVIEW_WIDTH = 640;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function loadPreviewWidth(): number {
  try {
    const raw = localStorage.getItem(PREVIEW_WIDTH_KEY);
    if (!raw) return DEFAULT_PREVIEW_WIDTH;
    const value = Number(raw);
    if (Number.isFinite(value)) return Math.max(MIN_PREVIEW_WIDTH, value);
  } catch {
    // Storage can be blocked; the default size still applies.
  }
  return DEFAULT_PREVIEW_WIDTH;
}

function savePreviewWidth(width: number) {
  try {
    localStorage.setItem(PREVIEW_WIDTH_KEY, String(Math.round(width)));
  } catch {
    // Ignore quota and private-mode failures.
  }
}

function PreviewCard({
  label,
  lines,
  section,
  muted,
  theme,
  blackout,
  titleSlide,
  author,
}: {
  label: string;
  lines: string[];
  section?: string;
  muted?: boolean;
  theme: StageTheme;
  blackout?: boolean;
  titleSlide?: boolean;
  author?: string;
}) {
  const surface = blackout
    ? { background: "#000000", color: "#ffffff", borderColor: "rgba(255,255,255,0.1)" }
    : { ...stageSurfaceStyle(theme), borderColor: stageEdgeColor(theme) };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          {label}
        </h3>
        {section && <span className="text-[11px] text-gold-200">{section}</span>}
      </div>
      <div
        className={`relative aspect-video w-full overflow-hidden rounded-2xl border shadow-stage ${
          muted ? "opacity-70" : ""
        }`}
        style={surface}
      >
        {blackout ? null : titleSlide && lines.length ? (
          <StageTitle title={lines[0] ?? ""} author={author} theme={theme} />
        ) : lines.length ? (
          <div className={LYRIC_STAGE_INSET}>
            <FittedLyrics lines={lines} theme={theme} />
          </div>
        ) : (
          <p
            className="absolute inset-0 flex items-center justify-center text-sm uppercase tracking-[0.24em]"
            style={{ color: stageMutedColor(theme) }}
          >
            Empty
          </p>
        )}
      </div>
    </div>
  );
}

export default function DualPreview() {
  const { activeSong, slides, currentIndex, blackout, clear, upcoming } = usePresentation();
  const theme = stageThemeById(songThemeId(activeSong));
  const nextTheme = stageThemeById(upcoming?.theme ?? songThemeId(activeSong));
  const current = slides[currentIndex];

  const currentLines = blackout || clear ? [] : current?.lines ?? [];
  const nextLines = upcoming?.slide.lines ?? [];
  const currentTitle = !blackout && !clear && current?.titleSlide;
  const nextTitle = upcoming?.slide.titleSlide;
  const nextSection = upcoming?.songTitle
    ? `${upcoming.songTitle} · ${upcoming.slide.sectionLabel}`
    : upcoming?.slide.sectionLabel;

  const slotRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; width: number } | null>(null);
  const [width, setWidth] = useState(loadPreviewWidth);
  const [slotWidth, setSlotWidth] = useState(0);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const measure = () => setSlotWidth(slot.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  const ceiling = slotWidth > 0 ? slotWidth : width;
  const floor = slotWidth > 0 ? Math.min(MIN_PREVIEW_WIDTH, slotWidth) : MIN_PREVIEW_WIDTH;
  const applied = clamp(width, floor, Math.max(ceiling, floor));

  const commit = (next: number) => {
    const clamped = clamp(next, floor, Math.max(ceiling, floor));
    setWidth(clamped);
    savePreviewWidth(clamped);
  };

  const onGripPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, width: applied };
  };

  const onGripPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    commit(drag.width + event.clientX - drag.x);
  };

  const onGripPointerUp = () => {
    dragRef.current = null;
  };

  const onGripKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 80 : 24;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = applied + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = applied - step;
    else if (event.key === "Home") next = floor;
    else if (event.key === "End") next = ceiling;
    else return;
    event.preventDefault();
    event.stopPropagation();
    commit(next);
  };

  return (
    <div ref={slotRef} className="min-w-0">
      <div className="mb-2 flex items-center justify-end gap-3">
        <label
          htmlFor="preview-size"
          className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500"
        >
          Preview size
        </label>
        <input
          id="preview-size"
          type="range"
          min={floor}
          max={Math.max(ceiling, floor)}
          step={1}
          value={applied}
          aria-valuemin={floor}
          aria-valuemax={Math.max(ceiling, floor)}
          aria-valuenow={Math.round(applied)}
          aria-label="Preview size"
          title="Resize the current and next slide previews"
          onChange={(event) => commit(Number(event.target.value))}
          className="preview-size w-28 cursor-pointer"
        />
      </div>
      <div className="flex min-w-0 items-stretch" style={{ width: applied, maxWidth: "100%" }}>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-4">
          <PreviewCard
            label="Current slide"
            section={blackout ? "Blackout" : clear ? "Clear" : current?.sectionLabel}
            lines={currentLines}
            theme={theme}
            blackout={blackout}
            titleSlide={currentTitle}
            author={current?.author}
          />
          <PreviewCard
            label={upcoming?.songTitle ? "Next song" : "Next slide"}
            section={nextSection}
            lines={nextLines}
            theme={nextTheme}
            muted
            titleSlide={nextTitle}
            author={upcoming?.slide.author}
          />
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize slide previews"
          aria-valuemin={Math.round(floor)}
          aria-valuemax={Math.round(Math.max(ceiling, floor))}
          aria-valuenow={Math.round(applied)}
          tabIndex={0}
          title="Drag to resize previews. Double-click to reset."
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={onGripPointerUp}
          onPointerCancel={onGripPointerUp}
          onDoubleClick={() => commit(DEFAULT_PREVIEW_WIDTH)}
          onKeyDown={onGripKeyDown}
          className="ml-1.5 flex w-3 shrink-0 cursor-ew-resize touch-none items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-stone-400 hover:border-gold-200/70 hover:text-gold-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        >
          <span className="flex flex-col gap-1" aria-hidden>
            <span className="h-0.5 w-1.5 rounded-full bg-current" />
            <span className="h-0.5 w-1.5 rounded-full bg-current" />
            <span className="h-0.5 w-1.5 rounded-full bg-current" />
          </span>
        </div>
      </div>
    </div>
  );
}
