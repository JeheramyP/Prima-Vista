/**
 * Section and slide helpers.
 *
 * Turns a song into the slide list the controller shows and the output
 * follows: one generated title slide, then four lyric lines per slide.
 * Also owns section labels, the editor palette, and card reorder helpers.
 * Slide ids (`${sectionId}-${chunk}` and `${songId}:title`) are what
 * Update slides uses to stay on the same cue after a rebuild.
 */
import type { LyricSection, SectionKind, Slide, Song, SongDraft } from "../types";

/** Lyric slides hold this many lines. The title slide is separate and holds the song name. */
const LINES_PER_SLIDE = 4;

export const SECTION_KIND_DRAG_TYPE = "application/x-prima-vista-section-kind";
export const SECTION_ID_DRAG_TYPE = "application/x-prima-vista-section";

export const SECTION_PALETTE: { kind: SectionKind; name: string }[] = [
  { kind: "verse", name: "Verse" },
  { kind: "chorus", name: "Chorus" },
  { kind: "bridge", name: "Bridge" },
  { kind: "instrumental", name: "Instrumental" },
  { kind: "tag", name: "Tag" },
];

const KIND_NAME: Record<SectionKind, string> = {
  verse: "Verse",
  chorus: "Chorus",
  bridge: "Bridge",
  prechorus: "Pre-Chorus",
  tag: "Tag",
  instrumental: "Instrumental",
  intro: "Intro",
  ending: "Ending",
  other: "Section",
};

export const EMPTY_DRAFT: SongDraft = {
  title: "Untitled",
  artist: "",
  key: "",
  sections: [],
};

/** Lyric lines, or an empty list when a section was stored without them. */
function sectionLines(section: { lines?: unknown } | null | undefined): string[] {
  if (!section || !Array.isArray(section.lines)) return [];
  if (section.lines.every((line) => typeof line === "string")) return section.lines;
  return section.lines.filter((line): line is string => typeof line === "string");
}

/** One slide per four lines, in section order. An empty section still yields one slide. */
export function sectionsToSlides(sections: LyricSection[]): Slide[] {
  const slides: Slide[] = [];
  withSectionLabels(sections).forEach((section) => {
    const chunks = chunkLines(sectionLines(section), LINES_PER_SLIDE);
    chunks.forEach((lines, chunkIndex) => {
      slides.push({
        id: `${section.id}-${chunkIndex}`,
        sectionId: section.id,
        sectionLabel: section.label,
        kind: section.kind,
        lines,
      });
    });
  });
  return slides;
}

/** Opening slide for a song. Generated from the title and artist, never stored as a section. */
export function titleSlideForSong(song: Pick<Song, "id" | "title" | "artist">): Slide {
  const title = song.title.trim() || "Untitled";
  const author = song.artist.trim();
  return {
    id: `${song.id}:title`,
    sectionId: `${song.id}:title`,
    sectionLabel: "Title",
    kind: "other",
    lines: [title],
    titleSlide: true,
    author: author || undefined,
  };
}

/** Title card first, then the section slides. The title card is not stored on the song. */
export function songToSlides(song: Song): Slide[] {
  const sections = Array.isArray(song?.sections) ? song.sections : [];
  return [titleSlideForSong(song), ...sectionsToSlides(sections)];
}

function chunkLines(lines: string[], size: number): string[][] {
  if (!lines?.length) return [[]];
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += size) {
    chunks.push(lines.slice(i, i + size));
  }
  return chunks;
}

export function kindTone(kind: SectionKind): string {
  switch (kind) {
    case "chorus":
      return "bg-gold-500/20 text-gold-200 border-gold-500/30";
    case "bridge":
      return "bg-violet-500/20 text-violet-200 border-violet-400/30";
    case "prechorus":
      return "bg-sky-500/20 text-sky-200 border-sky-400/30";
    case "tag":
    case "ending":
      return "bg-rose-500/20 text-rose-200 border-rose-400/30";
    case "intro":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
    case "instrumental":
      return "bg-cyan-500/20 text-cyan-200 border-cyan-400/30";
    default:
      return "bg-white/10 text-stone-200 border-white/10";
  }
}

export function isPaletteKind(value: string): value is SectionKind {
  return SECTION_PALETTE.some((item) => item.kind === value);
}

const ALWAYS_NUMBERED: SectionKind[] = ["verse", "chorus", "other"];

export function kindName(kind: SectionKind) {
  return KIND_NAME[kind];
}

/** `partsOfKind` counts distinct numbers, so a lone bridge reads "Bridge" but choruses always carry a number. */
export function displayLabel(kind: SectionKind, number: number, partsOfKind: number): string {
  const name = KIND_NAME[kind];
  if (ALWAYS_NUMBERED.includes(kind) || partsOfKind > 1) return `${name} ${number}`;
  return name;
}

/**
 * Fills in missing numbers and recomputes labels. Older songs have no numbers:
 * sections of a kind with identical lyrics share a number, others count up.
 */
export function withSectionLabels(sections: LyricSection[]): LyricSection[] {
  const list = Array.isArray(sections)
    ? sections.filter((section): section is LyricSection => !!section && typeof section === "object")
    : [];
  const used = new Map<SectionKind, Set<number>>();
  for (const section of list) {
    if (section.number === undefined) continue;
    const set = used.get(section.kind) ?? new Set<number>();
    set.add(section.number);
    used.set(section.kind, set);
  }
  const byLyrics = new Map<string, number>();
  const numbered = list.map((section) => {
    if (section.number !== undefined) return section;
    const set = used.get(section.kind) ?? new Set<number>();
    used.set(section.kind, set);
    const lyrics = sectionLines(section)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
    const key = `${section.kind}\n${lyrics}`;
    let number = lyrics ? byLyrics.get(key) : undefined;
    if (number === undefined) {
      number = 1;
      while (set.has(number)) number += 1;
      set.add(number);
      if (lyrics) byLyrics.set(key, number);
    }
    return { ...section, number };
  });
  return numbered.map((section) => ({
    ...section,
    lines: sectionLines(section),
    label: displayLabel(section.kind, section.number!, used.get(section.kind)?.size ?? 1),
  }));
}

/** Numbers offered for a section: every number in use for its kind, plus the next new one. */
export function sectionNumberOptions(
  sections: { kind: SectionKind; number?: number }[],
  kind: SectionKind,
) {
  const max = sections.reduce(
    (highest, section) =>
      section.kind === kind && section.number !== undefined
        ? Math.max(highest, section.number)
        : highest,
    0,
  );
  return Array.from({ length: max + 1 }, (_, index) => index + 1);
}

export function nextSectionNumber(sections: LyricSection[], kind: SectionKind) {
  return sectionNumberOptions(withSectionLabels(sections), kind).length;
}

export function cleanSectionLines(sections: LyricSection[]): LyricSection[] {
  return sections.map((section) => ({
    ...section,
    lines: sectionLines(section)
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  }));
}

export function songToDraft(song: Song): SongDraft {
  return {
    title: song.title,
    artist: song.artist,
    key: song.key ?? "",
    sections: withSectionLabels(song.sections).map((section) => ({
      ...section,
      lines: [...sectionLines(section)],
    })),
  };
}

export function draftToSong(id: string, draft: SongDraft): Song {
  const key = draft.key.trim();
  return {
    id,
    title: draft.title.trim() || "Untitled",
    artist: draft.artist.trim(),
    key: key || undefined,
    sections: cleanSectionLines(withSectionLabels(draft.sections)),
  };
}

export function createSection(kind: SectionKind, number = 1): LyricSection {
  return {
    id: `sec-${crypto.randomUUID()}`,
    kind,
    label: displayLabel(kind, number, 1),
    number,
    lines: [],
  };
}

export function insertSection(sections: LyricSection[], index: number, section: LyricSection) {
  const next = [...sections];
  next.splice(Math.max(0, Math.min(sections.length, index)), 0, section);
  return next;
}

export function moveSections(sections: LyricSection[], from: number, toIndex: number) {
  if (from < 0) return sections;
  const target = Math.max(0, Math.min(sections.length, toIndex));
  const adjusted = from < target ? target - 1 : target;
  if (adjusted === from) return sections;
  const next = [...sections];
  const [moved] = next.splice(from, 1);
  next.splice(adjusted, 0, moved);
  return next;
}

export function duplicateSection(sections: LyricSection[], id: string) {
  const index = sections.findIndex((section) => section.id === id);
  if (index === -1) return sections;
  const source = withSectionLabels(sections)[index];
  const copy: LyricSection = {
    ...createSection(source.kind, source.number),
    lines: [...sectionLines(source)],
  };
  return insertSection(sections, index + 1, copy);
}

export function slideCount(lines: string[]) {
  const filled = lines.filter((line) => line.trim()).length;
  if (!filled) return 1;
  return Math.ceil(filled / LINES_PER_SLIDE);
}
