import { usePresentation } from "../state/PresentationContext";

export default function SongList() {
  const { results, activeSong, selectSong } = usePresentation();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Songs
        </h2>
        <span className="text-[11px] text-stone-500">{results.length}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-auto pr-1">
        {results.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-sm text-stone-500">
            No matching songs in the library.
          </p>
        )}
        {results.map((song) => {
          const active = activeSong?.id === song.id;
          return (
            <button
              key={song.id}
              type="button"
              onClick={() => void selectSong(song)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-gold-500/40 bg-gold-500/10"
                  : "border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]"
              }`}
            >
              <div className="truncate font-medium text-stone-100">{song.title}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
                <span className="truncate">{song.artist}</span>
                {song.key && (
                  <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] tracking-wide text-gold-200">
                    {song.key}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
