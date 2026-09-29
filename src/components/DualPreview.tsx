import { usePresentation } from "../state/PresentationContext";

function PreviewCard({
  label,
  lines,
  section,
  muted,
}: {
  label: string;
  lines: string[];
  section?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          {label}
        </h3>
        {section && <span className="text-[11px] text-gold-200">{section}</span>}
      </div>
      <div
        className={`lyric-stage flex min-h-[180px] flex-1 items-center justify-center rounded-2xl border border-white/10 px-6 py-8 text-center shadow-stage ${
          muted ? "opacity-70" : ""
        }`}
      >
        {lines.length ? (
          <p className="max-w-[28ch] font-display text-2xl font-medium leading-snug tracking-wide text-white sm:text-3xl">
            {lines.map((line, index) => (
              <span key={`${index}-${line}`} className="block">
                {line}
              </span>
            ))}
          </p>
        ) : (
          <p className="text-sm uppercase tracking-[0.24em] text-stone-500">Empty</p>
        )}
      </div>
    </div>
  );
}

export default function DualPreview() {
  const { slides, currentIndex, blackout, clear } = usePresentation();
  const current = slides[currentIndex];
  const upcoming = slides[currentIndex + 1];

  const currentLines = blackout || clear ? [] : current?.lines ?? [];
  const nextLines = upcoming?.lines ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PreviewCard
        label="Current slide"
        section={blackout ? "Blackout" : clear ? "Clear" : current?.sectionLabel}
        lines={currentLines}
      />
      <PreviewCard
        label="Next slide"
        section={upcoming?.sectionLabel}
        lines={nextLines}
        muted
      />
    </div>
  );
}
