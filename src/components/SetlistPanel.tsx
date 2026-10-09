/**
 * Setlist column.
 *
 * Accepts library songs and reorders its own rows. + Scripture appends a verse
 * slide; drag that row to place it. The drop index is the row whose midpoint
 * the pointer has passed. Clicking a row follows that entry from its first
 * slide. Clear asks for confirmation, then empties the list. It stays
 * disabled while the output window is open.
 */
import { useRef, useState, type DragEvent } from "react";
import { confirmDialog } from "../lib/confirm";
import { beginDragClickGuard, endDragClickGuard, ignoreClickAfterDrag } from "../lib/dragClick";
import { SETLIST_DRAG_TYPE, SONG_DRAG_TYPE } from "../lib/setlist";
import { usePresentation } from "../state/PresentationContext";

function hasDragType(event: DragEvent, type: string) {
  return Array.from(event.dataTransfer.types).includes(type);
}

export default function SetlistPanel() {
  const {
    setlist,
    activeEntryId,
    addToSetlist,
    addScriptureToSetlist,
    moveSetlistEntry,
    removeFromSetlist,
    clearSetlist,
    selectSetlistEntry,
    presentationOpen,
  } = usePresentation();
  const listRef = useRef<HTMLDivElement>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const activeIndex = setlist.findIndex((item) => item.entry.id === activeEntryId);

  const insertionIndexAt = (clientY: number) => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-setlist-row]") ?? [];
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length;
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    const isSong = hasDragType(event, SONG_DRAG_TYPE);
    const isEntry = hasDragType(event, SETLIST_DRAG_TYPE);
    if (!isSong && !isEntry) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = isEntry ? "move" : "copy";
    const index = insertionIndexAt(event.clientY);
    if (index !== dropIndex) setDropIndex(index);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const related = event.relatedTarget as Node | null;
    if (!related || !event.currentTarget.contains(related)) setDropIndex(null);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const index = dropIndex ?? insertionIndexAt(event.clientY);
    const entryId = event.dataTransfer.getData(SETLIST_DRAG_TYPE);
    const songId = event.dataTransfer.getData(SONG_DRAG_TYPE);
    if (entryId) moveSetlistEntry(entryId, index);
    else if (songId) addToSetlist(songId, index);
    setDropIndex(null);
    setDraggingId(null);
  };

  const dropMarker = <div className="mx-1 h-0.5 rounded-full bg-gold-400" aria-hidden="true" />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Setlist
          </h2>
          <span className="text-[12px] text-stone-500">{setlist.length}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => addScriptureToSetlist()}
            title="Add a scripture slide at the end of the setlist"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[12px] font-medium text-stone-300 transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            + Scripture
          </button>
          {setlist.length > 0 && (
            <button
              type="button"
              disabled={presentationOpen}
              title={
                presentationOpen
                  ? "Close the output window before clearing the setlist"
                  : "Remove every row from the setlist"
              }
              onClick={() => {
                if (presentationOpen) return;
                if (confirmDialog("Remove everything from the setlist?")) clearSetlist();
              }}
              className={`rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[12px] font-medium transition disabled:cursor-default disabled:opacity-40 ${
                presentationOpen
                  ? "text-stone-500"
                  : "text-stone-300 hover:border-white/20 hover:bg-white/[0.07]"
              }`}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div
        ref={listRef}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClickCapture={ignoreClickAfterDrag}
        className={`min-h-0 flex-1 space-y-1 overflow-auto rounded-xl pr-1 transition ${
          dropIndex !== null ? "bg-gold-500/[0.04] ring-1 ring-gold-500/20" : ""
        }`}
      >
        {setlist.length === 0 && (
          <p
            className={`rounded-xl border border-dashed px-3 py-6 text-center text-sm ${
              dropIndex !== null ? "border-gold-400/50 text-gold-200" : "border-white/10 text-stone-500"
            }`}
          >
            Drag songs here to build the setlist.
          </p>
        )}
        {setlist.map((item, index) => {
          const active = item.entry.id === activeEntryId;
          const upNext = activeIndex !== -1 && index === activeIndex + 1;
          const title = item.kind === "scripture" ? item.entry.reference.trim() || "Scripture" : item.song.title;
          return (
            <div key={item.entry.id}>
              {dropIndex === index && dropMarker}
              <div
                data-setlist-row
                draggable
                onDragStart={(event) => {
                  beginDragClickGuard();
                  event.dataTransfer.setData(SETLIST_DRAG_TYPE, item.entry.id);
                  event.dataTransfer.effectAllowed = "move";
                  setDraggingId(item.entry.id);
                }}
                onDragEnd={() => {
                  endDragClickGuard();
                  setDraggingId(null);
                  setDropIndex(null);
                }}
                className={`group relative ${draggingId === item.entry.id ? "opacity-40" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => selectSetlistEntry(item.entry.id)}
                  className={`flex w-full cursor-grab items-center gap-3 rounded-xl border py-2.5 pl-3 pr-9 text-left transition active:cursor-grabbing ${
                    active
                      ? "border-gold-500/40 bg-gold-500/10"
                      : "border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]"
                  }`}
                >
                  <span
                    className={`w-5 shrink-0 text-right text-xs tabular-nums ${
                      active ? "text-gold-200" : "text-stone-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-stone-100">{title}</span>
                    {(item.kind === "song" && item.song.key) ||
                    (item.kind === "scripture" && item.entry.reference.trim()) ||
                    active ||
                    upNext ? (
                      <span className="mt-0.5 flex items-center gap-2 text-[12px] text-stone-500">
                        {item.kind === "song" && item.song.key && (
                          <span className="text-gold-200">{item.song.key}</span>
                        )}
                        {item.kind === "scripture" && item.entry.reference.trim() && (
                          <span className="uppercase tracking-wide text-sky-200/90">Scripture</span>
                        )}
                        {active && <span className="uppercase tracking-wide text-gold-300">Live</span>}
                        {upNext && <span className="uppercase tracking-wide text-stone-400">Up next</span>}
                      </span>
                    ) : null}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${title} from setlist`}
                  title="Remove from setlist"
                  onClick={() => removeFromSetlist(item.entry.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-stone-500 opacity-0 transition hover:bg-white/10 hover:text-stone-200 focus:opacity-100 group-hover:opacity-100"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
        {setlist.length > 0 && dropIndex === setlist.length && dropMarker}
      </div>
    </div>
  );
}
