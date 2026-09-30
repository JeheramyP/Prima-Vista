import {
  songThemeId,
  stageEdgeColor,
  stageLyricStyle,
  stageMutedColor,
  stageSurfaceStyle,
  stageThemeById,
  type StageTheme,
} from "../lib/stageThemes";
import { usePresentation } from "../state/PresentationContext";

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
        className={`relative flex min-h-[180px] flex-1 items-center justify-center rounded-2xl border px-6 py-8 text-center shadow-stage ${
          muted ? "opacity-70" : ""
        }`}
        style={surface}
      >
        {blackout ? null : titleSlide && lines.length ? (
          <div className="absolute inset-0 flex flex-col px-6 pb-5 pt-6">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <p className="max-w-[12ch] text-center text-4xl leading-tight" style={stageLyricStyle(theme)}>
                {lines[0]}
              </p>
            </div>
            {author ? (
              <p
                className="max-w-[70%] shrink-0 self-end text-right text-sm leading-snug"
                style={{
                  color: stageMutedColor(theme),
                  fontFamily: theme.fontFamily,
                  fontWeight: 400,
                }}
              >
                {author}
              </p>
            ) : null}
          </div>
        ) : lines.length ? (
          <p className="max-w-[28ch] text-2xl sm:text-3xl" style={stageLyricStyle(theme)}>
            {lines.map((line, index) => (
              <span key={`${index}-${line}`} className="block">
                {line}
              </span>
            ))}
          </p>
        ) : (
          <p
            className="text-sm uppercase tracking-[0.24em]"
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

  return (
    <div className="grid gap-4 lg:grid-cols-2">
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
  );
}
