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
 * How many lines a passage may use before the type stops growing.
 * Short readings stay on one line across the stage. Longer readings may wrap,
 * and the fitter still shrinks the type if that wrap does not fit the height.
 */
export function scriptureLineBudget(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 16) return 1;
  return Math.min(16, Math.max(2, Math.ceil(words / 11)));
}
