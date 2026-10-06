/**
 * Section editor.
 *
 * Edits the draft's title, artist, key, and ordered section cards. Palette
 * drags insert a kind. Card drags reorder. Update slides calls `applyEditor`,
 * which is what publishes an existing song. The Copy-paste tab is
 * `PasteLyricsMode`. The selected tab is kept in `lastMode` across unmounts
 * when the operator flips back to the Slides grid.
 */
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { confirmDialog } from "../lib/confirm";
import {
  SECTION_ID_DRAG_TYPE,
  SECTION_KIND_DRAG_TYPE,
  SECTION_PALETTE,
  createSection,
  duplicateSection,
  insertSection,
  isPaletteKind,
  kindTone,
  moveSections,
  nextSectionNumber,
  sectionNumberOptions,
  slideCount,
  withSectionLabels,
} from "../lib/slides";
import { usePresentation } from "../state/PresentationContext";
import PasteLyricsMode from "./PasteLyricsMode";
import SectionNumberSelect from "./SectionNumberSelect";
import type { LyricSection, SectionKind } from "../types";

function hasDragType(event: DragEvent, type: string) {
  return Array.from(event.dataTransfer.types).includes(type);
}

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-sanctuary-950 px-3 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-600 focus:border-gold-500/40 focus:ring-2 focus:ring-gold-400/15";

function SlideUpdateSpinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

type EditorMode = "sections" | "paste";

const EDITOR_MODES: { mode: EditorMode; name: string }[] = [
  { mode: "sections", name: "Sections" },
  { mode: "paste", name: "Copy-paste" },
];

/** Survives the editor unmounting when the Slides tab is shown. */
let lastMode: EditorMode = "sections";

export default function LyricEditor() {
  const { draft, setDraft, applyEditor, updatingSlides } = usePresentation();
  const [mode, setMode] = useState<EditorMode>(lastMode);
  const changeMode = (next: EditorMode) => {
    lastMode = next;
    setMode(next);
  };
  const listRef = useRef<HTMLDivElement>(null);
  const paletteDragged = useRef(false);
  const focusId = useRef<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sections = useMemo(() => withSectionLabels(draft.sections), [draft.sections]);

  useEffect(() => {
    const id = focusId.current;
    if (!id || !listRef.current) return;
    focusId.current = null;
    const card = listRef.current.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(id)}"]`);
    card?.scrollIntoView({ block: "nearest" });
    card?.querySelector("textarea")?.focus();
  }, [draft.sections]);

  const addSection = (kind: SectionKind, index = draft.sections.length, focus = false) => {
    const section = createSection(kind, nextSectionNumber(draft.sections, kind));
    if (focus) focusId.current = section.id;
    setDraft((current) => ({
      ...current,
      sections: insertSection(current.sections, index, section),
    }));
  };

  const insertionIndexAt = (clientY: number) => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-section-row]") ?? [];
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length;
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    const isKind = hasDragType(event, SECTION_KIND_DRAG_TYPE);
    const isSection = hasDragType(event, SECTION_ID_DRAG_TYPE);
    if (!isKind && !isSection) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = isSection ? "move" : "copy";
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
    const sectionId = event.dataTransfer.getData(SECTION_ID_DRAG_TYPE);
    const kind = event.dataTransfer.getData(SECTION_KIND_DRAG_TYPE);
    setDraft((current) => {
      if (sectionId) {
        const from = current.sections.findIndex((section) => section.id === sectionId);
        return { ...current, sections: moveSections(current.sections, from, index) };
      }
      if (isPaletteKind(kind)) {
        return {
          ...current,
          sections: insertSection(
            current.sections,
            index,
            createSection(kind, nextSectionNumber(current.sections, kind)),
          ),
        };
      }
      return current;
    });
    setDropIndex(null);
    setDraggingId(null);
  };

  const dropMarker = <div className="mx-1 my-1 h-0.5 rounded-full bg-gold-400" aria-hidden="true" />;

  return (
    <section className="flex flex-col">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Lyric editor
        </h2>
        <div
          role="radiogroup"
          aria-label="Editor mode"
          className="flex rounded-full border border-white/10 bg-white/5 p-0.5"
        >
          {EDITOR_MODES.map((item) => (
            <button
              key={item.mode}
              type="button"
              role="radio"
              aria-checked={mode === item.mode}
              onClick={() => changeMode(item.mode)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                mode === item.mode
                  ? "bg-white text-sanctuary-950"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void applyEditor()}
          aria-busy={updatingSlides}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-1.5 text-xs font-medium text-gold-200 transition hover:bg-gold-500/20"
        >
          {updatingSlides ? <SlideUpdateSpinner /> : null}
          <span>{updatingSlides ? "Updating slides" : "Update slides"}</span>
        </button>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_5.5rem]">
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Title
          </span>
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Artist
          </span>
          <input
            value={draft.artist}
            onChange={(event) =>
              setDraft((current) => ({ ...current, artist: event.target.value }))
            }
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Key
          </span>
          <input
            value={draft.key}
            onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value }))}
            className={fieldClass}
          />
        </label>
      </div>

      {mode === "paste" ? (
        <>
          <PasteLyricsMode />
          <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
            A title slide is added automatically. Each block takes the next paragraph of the lyrics
            in roadmap order, including a repeated Chorus 1. Every four lyric lines become one slide.
          </p>
        </>
      ) : (
        <>
          <div className="mb-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Add section
            </p>
            <div className="flex flex-wrap gap-2">
              {SECTION_PALETTE.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  draggable
                  title={`Drag to place a ${item.name.toLowerCase()}, or click to add it`}
                  onDragStart={(event) => {
                    paletteDragged.current = true;
                    event.dataTransfer.setData(SECTION_KIND_DRAG_TYPE, item.kind);
                    event.dataTransfer.effectAllowed = "copy";
                    setDraggingId(`palette:${item.kind}`);
                  }}
                  onDragEnd={() => {
                    window.setTimeout(() => {
                      paletteDragged.current = false;
                    }, 0);
                    setDraggingId(null);
                    setDropIndex(null);
                  }}
                  onClick={() => {
                    if (paletteDragged.current) {
                      paletteDragged.current = false;
                      return;
                    }
                    addSection(item.kind, draft.sections.length, true);
                  }}
                  className={`cursor-grab rounded-full border px-3 py-1 text-xs font-medium transition active:cursor-grabbing ${kindTone(item.kind)} ${
                    draggingId === `palette:${item.kind}` ? "opacity-40" : "hover:brightness-125"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={listRef}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`space-y-2 rounded-2xl pr-1 transition ${
              dropIndex !== null ? "bg-gold-500/[0.04] ring-1 ring-gold-500/20" : ""
            }`}
          >
            {sections.length === 0 && (
              <p
                className={`rounded-2xl border border-dashed px-4 py-10 text-center text-sm leading-relaxed ${
                  dropIndex !== null
                    ? "border-gold-400/50 text-gold-200"
                    : "border-white/10 text-stone-500"
                }`}
              >
                Drag a verse, chorus, bridge, instrumental, or tag here to start the song.
              </p>
            )}
            {sections.map((section, index) => (
              <div key={section.id}>
                {dropIndex === index && dropMarker}
                <div
                  data-section-row
                  data-section-id={section.id}
                  className={draggingId === section.id ? "opacity-40" : ""}
                >
                  <SectionCard
                    section={section}
                    numberOptions={sectionNumberOptions(sections, section.kind)}
                    onNumberChange={(number) =>
                      setDraft((current) => ({
                        ...current,
                        sections: current.sections.map((item) =>
                          item.id === section.id ? { ...item, number } : item,
                        ),
                      }))
                    }
                    onDragStart={(event) => {
                      event.dataTransfer.setData(SECTION_ID_DRAG_TYPE, section.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDraggingId(section.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropIndex(null);
                    }}
                    onLinesChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        sections: current.sections.map((item) =>
                          item.id === section.id ? { ...item, lines: value.split("\n") } : item,
                        ),
                      }))
                    }
                    onDuplicate={() =>
                      setDraft((current) => ({
                        ...current,
                        sections: duplicateSection(current.sections, section.id),
                      }))
                    }
                    onRemove={() => {
                      const filled = section.lines.some((line) => line.trim());
                      if (filled && !confirmDialog(`Remove ${section.label}?`)) return;
                      setDraft((current) => ({
                        ...current,
                        sections: current.sections.filter((item) => item.id !== section.id),
                      }));
                    }}
                  />
                </div>
              </div>
            ))}
            {sections.length > 0 && dropIndex === sections.length && dropMarker}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
            A title slide is added automatically. Drag a block into the song, or click one to add
            it. Drag a card handle to reorder. Use the number next to a section name to label it
            Chorus 1, Chorus 2, and so on. Every four lyric lines become one slide.
          </p>
        </>
      )}
    </section>
  );
}

function SectionCard({
  section,
  onDragStart,
  onDragEnd,
  onLinesChange,
  onDuplicate,
  onRemove,
  numberOptions,
  onNumberChange,
}: {
  section: LyricSection;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onLinesChange: (value: string) => void;
  numberOptions: number[];
  onNumberChange: (number: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const filled = section.lines.some((line) => line.trim());
  const count = slideCount(section.lines);
  const countLabel = !filled ? "Blank slide" : count === 1 ? "1 slide" : `${count} slides`;
  const instrumental = section.kind === "instrumental";

  return (
    <article className="rounded-2xl border border-white/10 bg-sanctuary-900/80 p-3">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          draggable
          aria-label={`Reorder ${section.label}`}
          title="Drag to reorder"
          onDragStart={(event) => {
            const card = event.currentTarget.closest("article");
            if (card instanceof HTMLElement) event.dataTransfer.setDragImage(card, 28, 24);
            onDragStart(event);
          }}
          onDragEnd={onDragEnd}
          className="cursor-grab rounded-lg p-1 text-stone-500 hover:bg-white/5 hover:text-stone-300 active:cursor-grabbing"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <circle cx="7" cy="5" r="1.15" />
            <circle cx="13" cy="5" r="1.15" />
            <circle cx="7" cy="10" r="1.15" />
            <circle cx="13" cy="10" r="1.15" />
            <circle cx="7" cy="15" r="1.15" />
            <circle cx="13" cy="15" r="1.15" />
          </svg>
        </button>
        <SectionNumberSelect
          kind={section.kind}
          value={section.number ?? 1}
          options={numberOptions}
          onChange={onNumberChange}
        />
        <span className="text-[11px] text-stone-500">{countLabel}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-lg px-2 py-1 text-[11px] font-medium text-stone-400 transition hover:bg-white/10 hover:text-stone-200"
          >
            Duplicate
          </button>
          <button
            type="button"
            aria-label={`Remove ${section.label}`}
            title={`Remove ${section.label}`}
            onClick={onRemove}
            className="rounded-lg p-1 text-stone-500 transition hover:bg-white/10 hover:text-stone-200"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </div>
      <textarea
        value={section.lines.join("\n")}
        onChange={(event) => onLinesChange(event.target.value)}
        spellCheck={false}
        rows={instrumental ? 2 : Math.min(12, Math.max(4, section.lines.length || 4))}
        placeholder={
          instrumental
            ? "Optional cue. Leave blank to clear the screen during the instrumental."
            : "One lyric line per row"
        }
        className={`${fieldClass} resize-y leading-relaxed`}
      />
    </article>
  );
}
