import type { LyricSection, SectionKind, Slide, Song } from "../types";

const LINES_PER_SLIDE = 2;

const KIND_FROM_LABEL: Record<string, SectionKind> = {
  verse: "verse",
  chorus: "chorus",
  bridge: "bridge",
  prechorus: "prechorus",
  "pre-chorus": "prechorus",
  tag: "tag",
  intro: "intro",
  ending: "ending",
  outro: "ending",
};

export function songToEditorText(song: Song): string {
  const header = `Title: ${song.title}\nArtist: ${song.artist}${song.key ? `\nKey: ${song.key}` : ""}\n`;
  const body = song.sections
    .map((section) => `[${section.label}]\n${section.lines.join("\n")}`)
    .join("\n\n");
  return `${header}\n${body}\n`;
}

export function parseEditorText(raw: string): {
  title: string;
  artist: string;
  key?: string;
  sections: LyricSection[];
} {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let title = "Untitled";
  let artist = "";
  let key: string | undefined;
  const sections: LyricSection[] = [];
  let current: LyricSection | null = null;
  let unnamed = 0;

  const flush = () => {
    if (current) {
      sections.push(current);
    }
    current = null;
  };

  for (const original of lines) {
    const line = original.trim();
    if (!line) continue;

    const titleMatch = line.match(/^title\s*:\s*(.*)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim() || "Untitled";
      continue;
    }
    const artistMatch = line.match(/^artist\s*:\s*(.*)$/i);
    if (artistMatch) {
      artist = artistMatch[1].trim();
      continue;
    }
    const keyMatch = line.match(/^key\s*:\s*(.*)$/i);
    if (keyMatch) {
      key = keyMatch[1].trim() || undefined;
      continue;
    }

    const heading = line.match(/^\[(.+)\]$/);
    if (heading) {
      flush();
      const label = heading[1].trim();
      const kind = inferKind(label);
      current = {
        id: `edit-${sections.length + 1}`,
        kind,
        label,
        lines: [],
      };
      continue;
    }

    if (!current) {
      unnamed += 1;
      current = {
        id: `edit-open-${unnamed}`,
        kind: "other",
        label: `Section ${unnamed}`,
        lines: [],
      };
    }
    current.lines.push(line);
  }

  flush();
  return { title, artist, key, sections };
}

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

export function songToSlides(song: Song): Slide[] {
  return sectionsToSlides(song.sections);
}

function inferKind(label: string): SectionKind {
  const key = label.toLowerCase().replace(/\s+\d+$/, "").trim();
  return KIND_FROM_LABEL[key] ?? (key.includes("verse") ? "verse" : "other");
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
    default:
      return "bg-white/10 text-stone-200 border-white/10";
  }
}
