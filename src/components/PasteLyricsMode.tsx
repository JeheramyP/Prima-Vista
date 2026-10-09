/**
 * Copy-paste editor.
 *
 * The left side is the pasted lyric text. The right side is the sung order.
 * Blocks are assigned by `assignBlocks`. Unused paragraphs stay in the text
 * and in `pasteCache` so leaving this tab does not throw them away, as long
 * as the draft sections still match what this mode last produced.
 */
import { useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { confirmDialog } from "../lib/confirm";
import {
  assignBlocks,
  createStep,
  insertStep,
  moveStep,
  nextStepNumber,
  removeStep,
  renumberStep,
  roadmapToSections,
  sectionsToPasteState,
  splitLyricBlocks,
  type RoadmapStep,
} from "../lib/pasteLyrics";
import {
  SECTION_ID_DRAG_TYPE,
  SECTION_KIND_DRAG_TYPE,
  SECTION_PALETTE,
  isPaletteKind,
  kindTone,
  sectionNumberOptions,
  slideCount,
} from "../lib/slides";
import { usePresentation } from "../state/PresentationContext";
import type { LyricSection, SectionKind } from "../types";
import SectionNumberSelect from "./SectionNumberSelect";

const DRAG_TYPES = [SECTION_KIND_DRAG_TYPE, SECTION_ID_DRAG_TYPE];

function sectionsSignature(sections: LyricSection[]) {
  return JSON.stringify(
    sections.map((section) => [
      section.id,
      section.kind,
      section.number,
      section.lines.map((line) => line.trim()).filter(Boolean),
    ]),
  );
}

/**
 * Keeps the pasted text across tab switches, including paragraphs not yet in
 * the roadmap. Only reused while the draft still matches what it produced.
 */
let pasteCache: {
  songId: string | null;
  signature: string;
  text: string;
  steps: RoadmapStep[];
} | null = null;

function initialState(songId: string | null, sections: LyricSection[]) {
  if (
    pasteCache &&
    pasteCache.songId === songId &&
    pasteCache.signature === sectionsSignature(sections)
  ) {
    return { text: pasteCache.text, steps: pasteCache.steps };
  }
  return sectionsToPasteState(sections);
}

function firstLine(lines: string[]) {
  return lines[0] ?? "";
}

export default function PasteLyricsMode() {
  const { draft, setDraft, activeSong } = usePresentation();
  const songId = activeSong?.id ?? null;
  const [initial] = useState(() => initialState(songId, draft.sections));
  const [text, setText] = useState(initial.text);
  const [steps, setSteps] = useState<RoadmapStep[]>(initial.steps);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chipDragged = useRef(false);
  const writtenSignature = useRef(sectionsSignature(draft.sections));
  const syncedSongId = useRef(songId);

  // An empty song signs as "[]", so the signature alone cannot tell two blanks
  // apart. Leaving the previous song's text in the field makes the next commit
  // write it into the song just selected.
  useLayoutEffect(() => {
    const signature = sectionsSignature(draft.sections);
    const songChanged = syncedSongId.current !== songId;
    if (!songChanged && signature === writtenSignature.current) return;
    syncedSongId.current = songId;
    writtenSignature.current = signature;
    const next = songChanged
      ? initialState(songId, draft.sections)
      : sectionsToPasteState(draft.sections);
    setText(next.text);
    setSteps(next.steps);
  }, [draft.sections, songId]);

  const blocks = useMemo(() => splitLyricBlocks(text), [text]);
  const { assignments, used } = useMemo(
    () => assignBlocks(steps, blocks.length),
    [steps, blocks.length],
  );
  const unused = blocks.length - used;

  const commit = (nextText: string, nextSteps: RoadmapStep[]) => {
    setText(nextText);
    setSteps(nextSteps);
    const sections = roadmapToSections(nextSteps, splitLyricBlocks(nextText));
    const signature = sectionsSignature(sections);
    writtenSignature.current = signature;
    pasteCache = { songId, signature, text: nextText, steps: nextSteps };
    setDraft((current) => ({ ...current, sections }));
  };

  const newStep = (kind: SectionKind) => createStep(kind, nextStepNumber(steps, kind));

  const stepFromDrag = (event: DragEvent): RoadmapStep | null => {
    const kind = event.dataTransfer.getData(SECTION_KIND_DRAG_TYPE);
    return isPaletteKind(kind) ? newStep(kind) : null;
  };

  const insertionIndexAt = (clientY: number) => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-step-row]") ?? [];
    for (let i = 0; i < rows.length; i += 1) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length;
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    const types = Array.from(event.dataTransfer.types);
    if (!DRAG_TYPES.some((type) => types.includes(type))) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = types.includes(SECTION_ID_DRAG_TYPE) ? "move" : "copy";
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
    const movedId = event.dataTransfer.getData(SECTION_ID_DRAG_TYPE);
    if (movedId) {
      commit(text, moveStep(steps, movedId, index));
    } else {
      const step = stepFromDrag(event);
      if (step) commit(text, insertStep(steps, index, step));
    }
    setDropIndex(null);
    setDraggingId(null);
  };

  const chipHandlers = (dragId: string, setData: (event: DragEvent) => void, add: () => void) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => {
      chipDragged.current = true;
      setData(event);
      event.dataTransfer.effectAllowed = "copy";
      setDraggingId(dragId);
    },
    onDragEnd: () => {
      window.setTimeout(() => {
        chipDragged.current = false;
      }, 0);
      setDraggingId(null);
      setDropIndex(null);
    },
    onClick: () => {
      if (chipDragged.current) {
        chipDragged.current = false;
        return;
      }
      add();
    },
  });

  const chipClass = (kind: SectionKind, dragId: string) =>
    `cursor-grab rounded-full border px-3 py-1 text-xs font-medium transition active:cursor-grabbing ${kindTone(kind)} ${
      draggingId === dragId ? "opacity-40" : "hover:brightness-125"
    }`;

  const dropMarker = (
    <div className="mx-1 my-1 h-0.5 rounded-full bg-gold-400" aria-hidden="true" />
  );

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex flex-col">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Full lyrics
        </label>
        <textarea
          value={text}
          onChange={(event) => commit(event.target.value, steps)}
          spellCheck={false}
          placeholder={
            "Paste the whole song here.\n\nLeave a blank line between each verse, chorus, and bridge."
          }
          className="min-h-[26rem] w-full flex-1 resize-y rounded-xl border border-white/10 bg-sanctuary-950 px-3 py-2 text-sm leading-relaxed text-stone-100 outline-none placeholder:text-stone-600 focus:border-gold-500/40 focus:ring-2 focus:ring-gold-400/15"
        />
        <p className="mt-2 text-[12px] leading-relaxed text-stone-500">
          {blocks.length === 1 ? "1 block found" : `${blocks.length} blocks found`}
          {unused > 0 && (
            <span className="text-amber-300/90">
              {" "}
              · {unused === 1 ? "1 block is" : `${unused} blocks are`} not in the roadmap yet
            </span>
          )}
          . Headers such as [Verse 1] or Chorus: are skipped.
        </p>
      </div>

      <div className="flex flex-col rounded-2xl border border-white/10 bg-sanctuary-900/50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Roadmap
          </p>
          {steps.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirmDialog("Clear the roadmap?")) commit(text, []);
              }}
              className="rounded-lg px-2 py-0.5 text-[12px] font-medium text-stone-500 transition hover:bg-white/10 hover:text-stone-200"
            >
              Clear
            </button>
          )}
        </div>

        <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-stone-600">New block</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SECTION_PALETTE.map((item) => {
            const dragId = `palette:${item.kind}`;
            return (
              <button
                key={item.kind}
                type="button"
                title={`Drag to place a new ${item.name.toLowerCase()}, or click to add it`}
                className={chipClass(item.kind, dragId)}
                {...chipHandlers(
                  dragId,
                  (event) => event.dataTransfer.setData(SECTION_KIND_DRAG_TYPE, item.kind),
                  () => commit(text, insertStep(steps, steps.length, newStep(item.kind))),
                )}
              >
                {item.name}
              </button>
            );
          })}
        </div>

        <div
          ref={listRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`min-h-[8rem] flex-1 space-y-1.5 rounded-xl p-1 transition ${
            dropIndex !== null ? "bg-gold-500/[0.04] ring-1 ring-gold-500/20" : ""
          }`}
        >
          {steps.length === 0 && (
            <p
              className={`rounded-xl border border-dashed px-3 py-8 text-center text-xs leading-relaxed ${
                dropIndex !== null
                  ? "border-gold-400/50 text-gold-200"
                  : "border-white/10 text-stone-500"
              }`}
            >
              Drag blocks here in the order they are sung. Each block takes the next paragraph of
              the lyrics.
            </p>
          )}
          {assignments.map(({ step, label, block }, index) => {
            const lines = block === null ? [] : blocks[block];
            const instrumental = step.kind === "instrumental";
            const count = slideCount(lines);
            return (
              <div key={step.id}>
                {dropIndex === index && dropMarker}
                <div
                  data-step-row
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(SECTION_ID_DRAG_TYPE, step.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggingId(step.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropIndex(null);
                  }}
                  title="Drag to reorder"
                  className={`cursor-grab rounded-xl border border-white/10 bg-sanctuary-900/80 px-2.5 py-2 active:cursor-grabbing ${
                    draggingId === step.id ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SectionNumberSelect
                      kind={step.kind}
                      value={step.number}
                      options={sectionNumberOptions(steps, step.kind)}
                      onChange={(number) => commit(text, renumberStep(steps, step.id, number))}
                    />
                    {lines.length > 0 && (
                      <span className="text-[11px] text-stone-500">
                        {count === 1 ? "1 slide" : `${count} slides`}
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${label}`}
                      title={`Remove ${label}`}
                      onClick={() => commit(text, removeStep(steps, step.id))}
                      className="ml-auto rounded-lg p-0.5 text-stone-500 transition hover:bg-white/10 hover:text-stone-200"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                      </svg>
                    </button>
                  </div>
                  <p
                    className={`mt-1 truncate text-[12px] ${
                      instrumental || lines.length ? "text-stone-400" : "text-amber-300/90"
                    }`}
                  >
                    {instrumental
                      ? "Blank screen"
                      : lines.length
                        ? firstLine(lines)
                        : "No lyrics left. Shows a blank slide."}
                  </p>
                </div>
              </div>
            );
          })}
          {steps.length > 0 && dropIndex === steps.length && dropMarker}
        </div>

        {unused > 0 && (
          <p className="mt-2 truncate text-[12px] text-stone-500">
            Next new block: <span className="text-stone-300">{firstLine(blocks[used])}</span>
          </p>
        )}
      </div>
    </div>
  );
}
