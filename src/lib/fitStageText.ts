/**
 * Font-size search used by `FittedLyrics`.
 *
 * Finds the largest integer pixel size that still fits a measured box.
 * The cap is a fraction of the stage height, then lowered so the line stack
 * can fit. It is not a fraction of the window width.
 */

/** Smallest rendered size the fitter will try. Below this, a line still stays inside the stage. */
const MIN_FONT_PX = 1;

/**
 * Largest integer px in `[minPx, maxPx]` for which `fits` is true.
 * `fits` must stay true once it becomes true (larger type only gets bigger).
 */
export function largestSizeThatFits(
  fits: (px: number) => boolean,
  minPx: number,
  maxPx: number,
): number {
  const min = Math.max(1, Math.floor(minPx));
  const max = Math.max(min, Math.floor(maxPx));
  if (fits(max)) return max;
  if (!fits(min)) return min;
  let low = min;
  let high = max;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (fits(mid)) low = mid;
    else high = mid - 1;
  }
  return low;
}

/**
 * Upper bound before measuring glyphs. This is a fraction of the stage box height,
 * then lowered so the line stack can still fit. It is not a fraction of window width.
 */
export function stageFontCapPx(boxHeight: number, lineCount: number, lineHeight: number, heightRatio: number) {
  if (boxHeight <= 0) return MIN_FONT_PX;
  const leading = lineHeight > 0 ? lineHeight : 1.2;
  const byPreference = boxHeight * heightRatio;
  const byStack = boxHeight / (Math.max(1, lineCount) * leading);
  return Math.max(MIN_FONT_PX, Math.min(byPreference, byStack));
}

export { MIN_FONT_PX };

/**
 * Scripture always uses the full stage width.
 *
 * A narrow column grows the type until each line is a single word. A full-width
 * line keeps a short reading as a phrase across the window. Longer readings
 * still fit one slide by using more words on each of those full-width lines.
 */
export function scriptureMeasure(): string {
  return "100%";
}

/**
 * Fitted size, as a fraction of the stage cap, below which another line is
 * worth more than holding the current wrap. In the preview a 16-word line sat
 * near 5px while one more line reached about 9px, and 9px is about this
 * fraction of that card's cap. The projector uses the same ratio because the
 * cap scales with the stage.
 */
export const SCRIPTURE_READABLE_FRACTION = 0.22;

/** Smallest fitted size that should keep its line count. Below this, open another line. */
export function scriptureReadableFloorPx(maxPx: number): number {
  if (maxPx <= MIN_FONT_PX) return MIN_FONT_PX;
  return Math.max(MIN_FONT_PX + 1, Math.round(maxPx * SCRIPTURE_READABLE_FRACTION));
}

/**
 * How many lines a passage may use before the type stops growing.
 *
 * About one line per nine words, up to 16. A short phrase still lands on one
 * line, at roughly the size a longer reading uses once it wraps. A hard cutoff
 * at 16 words pinned a full sentence to a single line and left it far smaller
 * than a passage one word longer. The fitter may open further lines when that
 * guess is still under `scriptureReadableFloorPx`, and it still shrinks the
 * type if the wrap is taller than the stage.
 */
export function scriptureLineBudget(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(16, Math.max(1, Math.ceil(words / 9)));
}
