/**
 * Slide overview.
 *
 * One tile per derived slide, title card included. Clicking a tile jumps the
 * live index. Tiles show the section label and the lyric lines, not a second
 * copy of the stage layout.
 */
import { kindTone } from "../lib/slides";
import { usePresentation } from "../state/PresentationContext";

export default function SlideGrid() {
  const { slides, currentIndex, goTo } = usePresentation();

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Slide overview
        </h2>
        <span className="text-[11px] text-stone-500">
          {slides.length ? `${currentIndex + 1} / ${slides.length}` : "0"}
        </span>
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-2 gap-3 overflow-auto pr-1 xl:grid-cols-3">
        {slides.map((slide, index) => {
          const active = index === currentIndex;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(index)}
              className={`group rounded-2xl border p-3 text-left transition ${
                active
                  ? "border-gold-400 bg-gold-500/15 ring-1 ring-gold-400/60"
                  : "border-white/10 bg-sanctuary-800/80 hover:border-white/20"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    slide.titleSlide
                      ? "border-gold-500/30 bg-gold-500/20 text-gold-200"
                      : kindTone(slide.kind)
                  }`}
                >
                  {slide.sectionLabel}
                </span>
                <span className="text-[11px] tabular-nums text-stone-500">{index + 1}</span>
              </div>
              {slide.titleSlide ? (
                <div className="relative min-h-[4.4rem]">
                  <p className="px-1 pt-1 text-center text-[15px] font-medium leading-snug text-stone-100">
                    {slide.lines[0]}
                  </p>
                  {slide.author ? (
                    <p className="mt-2 text-right text-[11px] leading-snug text-stone-400">{slide.author}</p>
                  ) : null}
                </div>
              ) : (
                <p className="min-h-[3.2rem] whitespace-pre-line text-sm leading-snug text-stone-200">
                  {slide.lines.join("\n")}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
