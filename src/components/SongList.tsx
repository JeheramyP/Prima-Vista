/**
 * Library column.
 *
 * Lists search results, selects a song, and starts a drag of
 * `application/x-prima-vista-song` for the setlist. New song is cooled down
 * for a second so a double-click cannot create two blanks. Delete confirms
 * before removing the song from the library and the setlist.
 */
import { useEffect, useRef, useState } from "react";
import { confirmDialog } from "../lib/confirm";
import { beginDragClickGuard, endDragClickGuard, ignoreClickAfterDrag } from "../lib/dragClick";
import { SONG_DRAG_TYPE } from "../lib/setlist";
import { usePresentation } from "../state/PresentationContext";

const NEW_SONG_COOLDOWN_MS = 1000;

export default function SongList({ onNewSong }: { onNewSong?: () => void }) {
  const { query, results, activeSong, selectSong, createNewSong, deleteSong, addToSetlist } =
    usePresentation();
  const listRef = useRef<HTMLDivElement>(null);
  const newSongCoolingDownRef = useRef(false);
  const newSongCooldownTimerRef = useRef<number | null>(null);
  const [newSongCoolingDown, setNewSongCoolingDown] = useState(false);

  useEffect(() => {
    return () => {
      if (newSongCooldownTimerRef.current !== null) {
        window.clearTimeout(newSongCooldownTimerRef.current);
      }
    };
  }, []);

  function handleNewSong() {
    if (newSongCoolingDownRef.current) return;
    newSongCoolingDownRef.current = true;
    setNewSongCoolingDown(true);
    createNewSong();
    onNewSong?.();
    newSongCooldownTimerRef.current = window.setTimeout(() => {
      newSongCooldownTimerRef.current = null;
      newSongCoolingDownRef.current = false;
      setNewSongCoolingDown(false);
    }, NEW_SONG_COOLDOWN_MS);
  }

  useEffect(() => {
    if (!activeSong) return;
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-song-id="${CSS.escape(activeSong.id)}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [activeSong?.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Songs
        </h2>
        <span className="ml-auto text-[11px] text-stone-500">{results.length}</span>
        <button
          type="button"
          disabled={newSongCoolingDown}
          onClick={handleNewSong}
          className="rounded-lg border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[11px] font-medium text-gold-200 transition hover:bg-gold-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          New
        </button>
      </div>
      <div
        ref={listRef}
        onClickCapture={ignoreClickAfterDrag}
        className="min-h-0 flex-1 space-y-1 overflow-auto pr-1"
      >
        {results.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-sm text-stone-500">
            {query.trim() ? "No matching songs in the library." : "No songs yet."}
          </p>
        )}
        {results.map((song) => {
          const active = activeSong?.id === song.id;
          return (
            <div
              key={song.id}
              draggable
              onDragStart={(event) => {
                beginDragClickGuard();
                event.dataTransfer.setData(SONG_DRAG_TYPE, song.id);
                event.dataTransfer.setData("text/plain", song.title);
                event.dataTransfer.effectAllowed = "copy";
              }}
              onDragEnd={endDragClickGuard}
              data-song-id={song.id}
              className="group relative"
            >
              <button
                type="button"
                onClick={() => void selectSong(song)}
                className={`w-full cursor-grab rounded-xl border py-3 pl-3 pr-16 text-left transition active:cursor-grabbing ${
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
              <button
                type="button"
                aria-label={`Add ${song.title} to setlist`}
                title="Add to setlist"
                onClick={() => addToSetlist(song.id)}
                className="absolute right-9 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-500 opacity-0 transition hover:bg-gold-500/15 hover:text-gold-200 focus:opacity-100 group-hover:opacity-100"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={`Delete ${song.title}`}
                title="Delete song"
                onClick={() => {
                  if (confirmDialog(`Delete "${song.title}"? This cannot be undone.`)) {
                    void deleteSong(song.id);
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-500 opacity-0 transition hover:bg-red-500/15 hover:text-red-300 focus:opacity-100 group-hover:opacity-100"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
