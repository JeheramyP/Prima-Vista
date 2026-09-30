import type { LyricSection, SectionKind, Slide, Song, SongDraft } from "../types";

const LINES_PER_SLIDE = 2;

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

export function sectionsToSlides(sections: LyricSection[]): Slide[] {
  const slides: Slide[] = [];
  sections.forEach((section) => {
    const chunks = chunkLines(section.lines, LINES_PER_SLIDE);
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

export function songToSlides(song: Song): Slide[] {
  return [titleSlideForSong(song), ...sectionsToSlides(song.sections)];
}

function chunkLines(lines: string[], size: number): string[][] {
  if (!lines.length) return [[]];
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

export function displayLabel(kind: SectionKind, index: number, total: number): string {
  const name = KIND_NAME[kind];
  if (kind === "verse" || kind === "other" || total > 1) return `${name} ${index + 1}`;
  return name;
}

export function withSectionLabels(sections: LyricSection[]): LyricSection[] {
  const totals = new Map<SectionKind, number>();
  for (const section of sections) {
    totals.set(section.kind, (totals.get(section.kind) ?? 0) + 1);
  }
  const seen = new Map<SectionKind, number>();
  return sections.map((section) => {
    const index = seen.get(section.kind) ?? 0;
    seen.set(section.kind, index + 1);
    return {
      ...section,
      label: displayLabel(section.kind, index, totals.get(section.kind) ?? 1),
    };
  });
}

export function cleanSectionLines(sections: LyricSection[]): LyricSection[] {
  return sections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => line.trim()).filter((line) => line.length > 0),
  }));
}

export function songToDraft(song: Song): SongDraft {
  return {
    title: song.title,
    artist: song.artist,
    key: song.key ?? "",
    sections: song.sections.map((section) => ({
      ...section,
      lines: [...section.lines],
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

export function createSection(kind: SectionKind): LyricSection {
  return {
    id: `sec-${crypto.randomUUID()}`,
    kind,
    label: displayLabel(kind, 0, 1),
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
  const source = sections[index];
  const copy: LyricSection = {
    ...createSection(source.kind),
    lines: [...source.lines],
  };
  return insertSection(sections, index + 1, copy);
}

export function slideCount(lines: string[]) {
  const filled = lines.filter((line) => line.trim()).length;
  if (!filled) return 1;
  return Math.ceil(filled / LINES_PER_SLIDE);
}
