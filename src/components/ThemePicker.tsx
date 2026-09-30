import { songThemeId, STAGE_THEMES, stageThemeById } from "../lib/stageThemes";
import { usePresentation } from "../state/PresentationContext";

export default function ThemePicker() {
  const { activeSong, setSongTheme } = usePresentation();
  const theme = stageThemeById(songThemeId(activeSong));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
        Song theme
      </span>
      <div role="radiogroup" aria-label="Theme for the selected song" className="flex flex-wrap gap-1.5">
        {STAGE_THEMES.map((item) => {
          const selected = item.id === theme.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={item.blurb}
              disabled={!activeSong}
              onClick={() => setSongTheme(item.id)}
              className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
                selected
                  ? "border-gold-400/60 bg-gold-500/15 text-stone-50"
                  : "border-white/10 bg-white/[0.03] text-stone-400 hover:border-white/20 hover:text-stone-200"
              }`}
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/30"
                style={{ background: item.chip }}
              />
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
