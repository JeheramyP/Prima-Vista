/**
 * Copy-paste lyric import.
 *
 * Splits pasted text into blocks on blank lines and section headers, then
 * walks a roadmap in order. Each lyric step consumes the next block, including
 * a later step with the same kind and number. Instrumental steps take no block.
 */
import type { LyricSection, SectionKind } from "../types";
import { sectionNumberOptions, withSectionLabels } from "./slides";

/**
 * One block in the song roadmap. Kind and number are the label shown on the
 * slide. They do not decide which pasted paragraph the step reads.
 */
export type RoadmapStep = {
  id: string;
  kind: SectionKind;
  number: number;
};

export type RoadmapAssignment = {
  step: RoadmapStep;
  label: string;
  /** Index into the pasted blocks, or null when the step has no lyrics. */
  block: number | null;
};

const HEADER_WORD =
  "(?:verse|chorus|pre-?\\s?chorus|bridge|tag|intro|outro|ending|instrumental|interlude|refrain|hook)";

/** Lines like "[Verse 2]", "(Chorus)", "Bridge:", or "Chorus x2" that lyric sites put above sections. */
const HEADER_LINE = new RegExp(
  `^(?:[[(]\\s*${HEADER_WORD}\\b[^\\])]*[\\])]|${HEADER_WORD}(?:\\s*\\d+)?(?:\\s*x\\s*\\d+)?)\\s*:?$`,
  "i",
);

/** Splits pasted lyrics into blocks separated by blank lines or section headers. */
export function splitLyricBlocks(text: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length) blocks.push(current);
    current = [];
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || HEADER_LINE.test(line)) flush();
    else current.push(line);
  }
  flush();
  return blocks;
}

export function createStep(kind: SectionKind, number: number): RoadmapStep {
  return { id: `sec-${crypto.randomUUID()}`, kind, number };
}

export function nextStepNumber(steps: RoadmapStep[], kind: SectionKind) {
  return sectionNumberOptions(steps, kind).length;
}

/**
 * Walks the roadmap in order and gives each lyric step the next pasted block.
 * A repeated kind and number, such as a second Chorus 1, still takes the next
 * block from the lyric field. Instrumentals take no block.
 */
export function assignBlocks(steps: RoadmapStep[], blockCount: number) {
  const labels = withSectionLabels(
    steps.map((step) => ({ id: step.id, kind: step.kind, number: step.number, label: "", lines: [] })),
  );
  let used = 0;
  const assignments: RoadmapAssignment[] = steps.map((step, index) => {
    const label = labels[index].label;
    if (step.kind === "instrumental") return { step, label, block: null };
    const block = used < blockCount ? used : null;
    if (block !== null) used += 1;
    return { step, label, block };
  });
  return { assignments, used };
}

/** Applies block assignment and returns real lyric sections for the draft. */
export function roadmapToSections(steps: RoadmapStep[], blocks: string[][]): LyricSection[] {
  return assignBlocks(steps, blocks.length).assignments.map(({ step, label, block }) => ({
    id: step.id,
    kind: step.kind,
    label,
    number: step.number,
    lines: block === null ? [] : [...blocks[block]],
  }));
}

/**
 * Rebuilds paste text and a roadmap from existing sections. Each lyric
 * section with lines contributes its own paragraph, in order, so a repeated
 * Chorus 1 keeps the words on that card. Parts with no lyrics are dropped,
 * since they would take a pasted block that belongs to the next part.
 */
export function sectionsToPasteState(sections: LyricSection[]): {
  text: string;
  steps: RoadmapStep[];
} {
  const blocks: string[] = [];
  const steps: RoadmapStep[] = [];
  for (const section of withSectionLabels(sections)) {
    const step = { id: section.id, kind: section.kind, number: section.number ?? 1 };
    if (section.kind === "instrumental") {
      steps.push(step);
      continue;
    }
    const lines = section.lines.map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    blocks.push(lines.join("\n"));
    steps.push(step);
  }
  return { text: blocks.join("\n\n"), steps };
}

export function insertStep(steps: RoadmapStep[], index: number, step: RoadmapStep) {
  const next = [...steps];
  next.splice(Math.max(0, Math.min(steps.length, index)), 0, step);
  return next;
}

export function moveStep(steps: RoadmapStep[], id: string, toIndex: number) {
  const from = steps.findIndex((step) => step.id === id);
  if (from < 0) return steps;
  const target = Math.max(0, Math.min(steps.length, toIndex));
  const adjusted = from < target ? target - 1 : target;
  if (adjusted === from) return steps;
  const next = [...steps];
  const [moved] = next.splice(from, 1);
  next.splice(adjusted, 0, moved);
  return next;
}

export function removeStep(steps: RoadmapStep[], id: string) {
  return steps.filter((step) => step.id !== id);
}

export function renumberStep(steps: RoadmapStep[], id: string, number: number) {
  return steps.map((step) => (step.id === id ? { ...step, number } : step));
}
