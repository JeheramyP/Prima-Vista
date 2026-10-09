/**
 * Shared renderer types.
 *
 * `Song` and `LyricSection` are what the library stores. `Slide` is derived
 * from a song and is not written to disk. `SlidePayload` is the wire object
 * the controller sends and the output paints. `PrimaVistaAPI` is the preload
 * bridge on `window.primaVista`.
 */
import type { CustomThemeRecord, StageThemeId } from "./lib/stageThemes";

export type SectionKind =
  | "verse"
  | "chorus"
  | "bridge"
  | "prechorus"
  | "tag"
  | "instrumental"
  | "intro"
  | "ending"
  | "other";

export type LyricSection = {
  id: string;
  kind: SectionKind;
  label: string;
  /** 1-based. Sections with the same kind and number are the same part, such as Chorus 2 sung twice. */
  number?: number;
  lines: string[];
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  key?: string;
  /** CCLI song number, stored without the "CCLI" prefix. */
  ccli?: string;
  /** Copyright notice, which may include © or ℗. */
  copyright?: string;
  /** Output look for this song. Missing values use the Sanctuary theme. */
  theme?: StageThemeId;
  sections: LyricSection[];
};

export type SongDraft = {
  title: string;
  artist: string;
  key: string;
  ccli: string;
  copyright: string;
  sections: LyricSection[];
};

export type Slide = {
  id: string;
  sectionId: string;
  sectionLabel: string;
  kind: SectionKind;
  lines: string[];
  /** Opening slide built from the song title and artist. Not a lyric section. */
  titleSlide?: boolean;
  /** Credit shown on a title slide. */
  author?: string;
  /** CCLI song number shown on a title slide. */
  ccli?: string;
  /** Copyright notice shown on a title slide. */
  copyright?: string;
  /** Verse reading. The citation is `reference`, not a lyric line. */
  scriptureSlide?: boolean;
  /** Bible reference shown with a scripture slide. */
  reference?: string;
};

/** A queued song. The same song can appear more than once. */
export type SongSetlistEntry = {
  id: string;
  songId: string;
};

/** A verse reading queued between songs. Stored on the setlist, not in the library. */
export type ScriptureSetlistEntry = {
  id: string;
  kind: "scripture";
  /** Passage reference, such as "John 3:16". */
  reference: string;
  /** Verse text. The slide reflows it onto one reading; line breaks are kept as spaces. */
  text: string;
  /** Output look. Missing values use the Sanctuary theme. */
  theme?: StageThemeId;
};

export type SetlistEntry = SongSetlistEntry | ScriptureSetlistEntry;

export type SlidePayload = {
  songTitle: string;
  artist: string;
  sectionLabel: string;
  lines: string[];
  index: number;
  total: number;
  blackout: boolean;
  clear: boolean;
  theme: StageThemeId;
  /** Definition of `theme` when it is user-made, since the output window has no theme library. */
  customTheme?: CustomThemeRecord;
  /** Stage layout: large title, author in the lower right, copyright and CCLI along the bottom. */
  titleSlide?: boolean;
  /** CCLI song number. Shown on a title slide when set. */
  ccli?: string;
  /** Copyright notice. Shown on a title slide when set. */
  copyright?: string;
  /** Verse reading. The citation is `reference`. */
  scriptureSlide?: boolean;
  /** Bible reference shown under the verse. */
  reference?: string;
};

export type PrimaVistaAPI = {
  openPresentation: () => Promise<boolean>;
  closePresentation: () => Promise<boolean>;
  togglePresentationFullscreen: () => Promise<boolean>;
  exitPresentationFullscreen: () => Promise<boolean>;
  setSlide: (payload: SlidePayload) => void;
  getSlide: () => Promise<SlidePayload>;
  onSlideUpdate: (callback: (payload: SlidePayload) => void) => () => void;
  onPresentationClosed: (callback: () => void) => () => void;
  onPresentationFullscreen: (callback: (fullscreen: boolean) => void) => () => void;
  loadSongs: () => Promise<Song[] | null>;
  saveSongs: (songs: Song[]) => Promise<boolean>;
  loadThemes: () => Promise<CustomThemeRecord[] | null>;
  saveThemes: (themes: CustomThemeRecord[]) => Promise<boolean>;
  restoreWindowFocus: () => void;
};

declare global {
  interface Window {
    primaVista?: PrimaVistaAPI;
  }
}
