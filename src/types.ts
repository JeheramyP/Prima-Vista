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
  /** Output look for this song. Missing values use the Sanctuary theme. */
  theme?: StageThemeId;
  sections: LyricSection[];
};

export type SongDraft = {
  title: string;
  artist: string;
  key: string;
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
};

export type SetlistEntry = {
  id: string;
  songId: string;
};

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
  /** Stage layout: large title, author in the lower right. */
  titleSlide?: boolean;
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
