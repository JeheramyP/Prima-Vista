/**
 * Stage text that sizes itself to the box.
 *
 * Lyric lines stay on one line and shrink. Titles wrap. Measurement uses the
 * DOM, then `largestSizeThatFits`, then a short step-down if web fonts change
 * glyph widths. `StageTitle` is the shared title-card layout for the output
 * and the controller preview.
 */
import { useLayoutEffect, useRef, useState } from "react";
import {
  largestSizeThatFits,
  MIN_FONT_PX,
  scriptureLineBudget,
  scriptureMeasure,
  scriptureReadableFloorPx,
  stageFontCapPx,
} from "../lib/fitStageText";
import { titleSlideFooter } from "../lib/slides";
import { stageLyricStyle, stageMutedColor, type StageTheme } from "../lib/stageThemes";

/** Lyric block inset, as a fraction of the stage — shared by the output and the preview. */
export const LYRIC_STAGE_INSET = "absolute inset-x-[3%] inset-y-[10%]";
/** Title-slide inset, matching the output stage rather than the controller window. */
export const TITLE_STAGE_INSET = "absolute inset-x-[8%] bottom-[6.5%] top-[8%]";

type FittedLyricsProps = {
  lines: string[];
  theme: StageTheme;
  /** Titles wrap inside the stage. Lyric lines stay on one line and shrink instead. */
  wrap?: boolean;
  /** CSS max width used when wrapping, such as `14ch`. */
  maxWidth?: string;
  /** Even out wrapped line lengths. Used for a scripture passage. */
  balance?: boolean;
  /**
   * Most wrapped lines this block may use while the type is still growing.
   * Scripture sets this so a short passage stays one line across the stage.
   */
  maxLines?: number;
  align?: "center" | "left" | "right";
  color?: string;
  fontWeight?: number;
  /**
   * Largest size as a fraction of this box's height. The fitter then shrinks so the
   * glyphs stay inside the box. Lyric slides use a modest cap; titles run larger.
   */
  maxHeightRatio?: number;
};

export default function FittedLyrics({
  lines,
  theme,
  wrap = false,
  maxWidth,
  balance = false,
  maxLines = 0,
  align = "center",
  color,
  fontWeight,
  maxHeightRatio = 0.13,
}: FittedLyricsProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSizePx, setFontSizePx] = useState(MIN_FONT_PX);
  const lineKey = lines.join("\n");

  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text || lines.length === 0) return;

    let cancelled = false;
    const frames: number[] = [];
    const measure = () => {
      if (cancelled) return;
      const maxW = box.clientWidth;
      const maxH = box.clientHeight;
      if (maxW < 4 || maxH < 4) return;

      const scale = theme.sizeScale > 0 ? theme.sizeScale : 1;
      const limitW = maxW - 1;
      const limitH = maxH - 1;
      const renderedCap = stageFontCapPx(maxH, wrap ? 1 : lines.length, theme.lineHeight, maxHeightRatio);
      const maxPx = Math.max(MIN_FONT_PX, renderedCap / scale);
      const wrappedLines = () => {
        // Count line boxes of the text itself. A range over the element also
        // returns the block box, which would look like a second line.
        const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
        let count = 0;
        let node = walker.nextNode();
        while (node) {
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (rect.width > 1 && rect.height > 1) count += 1;
          }
          node = walker.nextNode();
        }
        return count;
      };
      const fits = (px: number, lineBudget: number) => {
        text.style.fontSize = `${px * scale}px`;
        if (!balance) return text.scrollWidth <= limitW && text.scrollHeight <= limitH;
        const widthOk = text.scrollWidth <= text.clientWidth + 1;
        const heightOk = text.scrollHeight <= limitH;
        if (!widthOk || !heightOk) return false;
        return lineBudget <= 0 || wrappedLines() <= lineBudget;
      };

      const wordCount = lines.join(" ").trim().split(/\s+/).filter(Boolean).length;
      let lineBudget = balance ? Math.max(1, maxLines) : 0;
      // A budget that spills even at the smallest size has to open up, or the
      // passage runs off the stage.
      if (balance && wordCount > lineBudget && !fits(MIN_FONT_PX, lineBudget)) {
        while (lineBudget < wordCount && !fits(MIN_FONT_PX, lineBudget)) lineBudget += 1;
      }

      let next = largestSizeThatFits((px) => fits(px, lineBudget), MIN_FONT_PX, maxPx);
      // The word budget is a guess. If the type is still a small fraction of
      // the stage, spend another line while that actually grows the glyphs.
      // Stop once the size clears the floor, another line stops helping, or a
      // few extra lines have been tried — a short phrase should not become
      // one word per line.
      if (balance && wordCount > lineBudget) {
        const floor = scriptureReadableFloorPx(maxPx);
        const limit = Math.min(wordCount, Math.max(lineBudget, 16));
        let opened = 0;
        while (lineBudget < limit && next < floor && opened < 4) {
          const withAnotherLine = largestSizeThatFits((px) => fits(px, lineBudget + 1), MIN_FONT_PX, maxPx);
          if (withAnotherLine <= next) break;
          lineBudget += 1;
          next = withAnotherLine;
          opened += 1;
        }
      }
      // Glyph widths can settle after the search (web fonts, optical size). Step down
      // against the layout we just forced so a long line cannot sit past the stage.
      let guard = 0;
      while (next > MIN_FONT_PX && !fits(next, lineBudget) && guard < 48) {
        next -= 1;
        guard += 1;
      }

      setFontSizePx((current) => (current === next ? current : next));
    };

    const schedule = () => {
      const first = requestAnimationFrame(() => {
        const second = requestAnimationFrame(measure);
        frames.push(second);
      });
      frames.push(first);
    };

    measure();
    schedule();
    const observer = new ResizeObserver(() => {
      frames.forEach((id) => cancelAnimationFrame(id));
      frames.length = 0;
      schedule();
    });
    observer.observe(box);

    const fonts = document.fonts;
    const onFonts = () => measure();
    fonts?.addEventListener("loadingdone", onFonts);
    void fonts?.ready.then(onFonts);
    const family = theme.fontFamily.split(",")[0]?.replace(/["']/g, "").trim();
    if (family && fonts) {
      void fonts.load(`${theme.fontWeight} 16px "${family}"`).then(onFonts);
    }

    return () => {
      cancelled = true;
      frames.forEach((id) => cancelAnimationFrame(id));
      observer.disconnect();
      fonts?.removeEventListener("loadingdone", onFonts);
    };
  }, [align, balance, lineKey, lines.length, maxHeightRatio, maxLines, maxWidth, theme, wrap]);

  const placed =
    align === "right"
      ? "absolute right-0 top-1/2 -translate-y-1/2 text-right"
      : align === "left"
        ? "absolute left-0 top-1/2 -translate-y-1/2 text-left"
        : "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center";
  // `w-max` keeps scrollWidth equal to the glyphs. A full-width box is always
  // one pixel over the fitter's limit, so wrapped credits would stay at 1px.
  // A balanced passage uses a real line width instead, so the fitter measures
  // the wrapped height rather than one unwrapped line.
  const widthClass = balance ? "max-w-full" : "w-max max-w-full";

  return (
    <div ref={boxRef} className="relative h-full w-full min-h-0 min-w-0">
      <div
        ref={textRef}
        className={`${placed} ${widthClass} ${wrap ? "break-words" : ""}`}
        style={{
          ...stageLyricStyle(theme, fontSizePx),
          ...(color ? { color } : {}),
          ...(fontWeight != null ? { fontWeight } : {}),
          ...(wrap
            ? balance
              ? { width: maxWidth ?? "100%", maxWidth: "100%", textWrap: "pretty" as const }
              : { maxWidth: maxWidth ? `min(${maxWidth}, 100%)` : "100%", textWrap: "wrap" as const }
            : {}),
        }}
      >
        {lines.map((line, index) => (
          <span key={`${index}-${line}`} className={wrap ? "block" : "block whitespace-nowrap"}>
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StageTitle({
  title,
  author,
  ccli,
  copyright,
  theme,
}: {
  title: string;
  author?: string;
  ccli?: string;
  copyright?: string;
  theme: StageTheme;
}) {
  const credit = author?.trim() ?? "";
  const legal = titleSlideFooter(ccli, copyright);
  const footerHeight = legal.length > 1 ? "h-[14%]" : "h-[9%]";

  return (
    <div className={`${TITLE_STAGE_INSET} flex flex-col`}>
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <FittedLyrics lines={[title]} theme={theme} wrap maxWidth="14ch" maxHeightRatio={0.22} />
        </div>
      </div>
      {legal.length ? (
        <div className={`mt-[1%] flex ${footerHeight} shrink-0 items-end gap-[4%]`}>
          <div className="h-full min-w-0 flex-1">
            <FittedLyrics
              lines={legal}
              theme={theme}
              wrap
              align={credit ? "left" : "center"}
              color={stageMutedColor(theme)}
              fontWeight={400}
              maxHeightRatio={0.72}
            />
          </div>
          {credit ? (
            <div className={`w-[38%] shrink-0 ${legal.length > 1 ? "h-[64%]" : "h-full"}`}>
              <FittedLyrics
                lines={[credit]}
                theme={theme}
                align="right"
                color={stageMutedColor(theme)}
                fontWeight={400}
                maxHeightRatio={0.82}
              />
            </div>
          ) : null}
        </div>
      ) : credit ? (
        <div className="mt-[1%] h-[9%] w-[58%] shrink-0 self-end">
          <FittedLyrics
            lines={[credit]}
            theme={theme}
            align="right"
            color={stageMutedColor(theme)}
            fontWeight={400}
            maxHeightRatio={0.82}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Verse centered, citation along the bottom. Shared by the output and the preview. */
export function StageScripture({
  lines,
  reference,
  theme,
}: {
  lines: string[];
  reference?: string;
  theme: StageTheme;
}) {
  const verse = lines.map((line) => line.trim()).filter((line) => line.length > 0);
  const cite = reference?.trim() ?? "";
  if (!verse.length && !cite) return null;

  return (
    <div className={`${TITLE_STAGE_INSET} flex flex-col`}>
      <div className="relative min-h-0 flex-1">
        {verse.length ? (
          <FittedLyrics
            lines={verse}
            theme={theme}
            wrap
            balance
            maxWidth={scriptureMeasure()}
            maxLines={scriptureLineBudget(verse.join(" "))}
            maxHeightRatio={0.32}
          />
        ) : null}
      </div>
      {cite ? (
        <div className="mt-[2%] h-[11%] shrink-0">
          <FittedLyrics
            lines={[cite]}
            theme={theme}
            align="center"
            color={stageMutedColor(theme)}
            fontWeight={400}
            maxHeightRatio={0.85}
          />
        </div>
      ) : null}
    </div>
  );
}
