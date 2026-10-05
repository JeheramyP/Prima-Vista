/**
 * Copy-paste lyric import.
 *
 * Splits pasted text into blocks on blank lines and section headers, then
 * walks a roadmap of kind/number steps. The first step of each kind and
 * number consumes the next block. A later step with the same pair reuses
 * it. Instrumental steps take no block.
 */
import type { LyricSection, SectionKind } from "../types";
import { sectionNumberOptions, withSectionLabels } from "./slides";

/**
 * One block in the song roadmap. Steps with the same kind and number share one
 * pasted paragraph, so Chorus 1 sung twice only needs to be pasted once.
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
  /** An earlier step with the same kind and number already took this block. */
  reused: boolean;
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

function partKey(step: { kind: SectionKind; number: number }) {
  return `${step.kind}:${step.number}`;
}

export function createStep(kind: SectionKind, number: number): RoadmapStep {
  return { id: `sec-${crypto.randomUUID()}`, kind, number };
}

export function nextStepNumber(steps: RoadmapStep[], kind: SectionKind) {
  return sectionNumberOptions(steps, kind).length;
}

/**
 * Walks the roadmap and gives each new kind and number the next unused pasted
 * block. Later steps with the same kind and number reuse it. Instrumentals take no block.
 */
export function assignBlocks(steps: RoadmapStep[], blockCount: number) {
  const labels = withSectionLabels(
    steps.map((step) => ({ id: step.id, kind: step.kind, number: step.number, label: "", lines: [] })),
  );
  const blockOf = new Map<string, number | null>();
  let used = 0;
  const assignments: RoadmapAssignment[] = steps.map((step, index) => {
    const label = labels[index].label;
    if (step.kind === "instrumental") return { step, label, block: null, reused: false };
    const key = partKey(step);
    const reused = blockOf.has(key);
    if (!reused) {
      blockOf.set(key, used < blockCount ? used : null);
      if (used < blockCount) used += 1;
    }
    return { step, label, block: blockOf.get(key) ?? null, reused };
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
 * Rebuilds paste text and a roadmap from existing sections. Each kind and
 * number contributes one paragraph, from its first section with lyrics.
 * Parts with no lyrics are dropped, since they would take a pasted block
 * that belongs to the next part.
 */
export function sectionsToPasteState(sections: LyricSection[]): {
  text: string;
  steps: RoadmapStep[];
} {
  const blocks: string[] = [];
  const seen = new Set<string>();
  const steps: RoadmapStep[] = [];
  for (const section of withSectionLabels(sections)) {
    const step = { id: section.id, kind: section.kind, number: section.number ?? 1 };
    const key = partKey(step);
    if (section.kind === "instrumental" || seen.has(key)) {
      steps.push(step);
      continue;
    }
    const lines = section.lines.map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    seen.add(key);
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
