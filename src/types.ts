export type SectionKind =
  | "verse"
  | "chorus"
  | "bridge"
  | "prechorus"
  | "tag"
  | "intro"
  | "ending"
  | "other";

export type LyricSection = {
  id: string;
  kind: SectionKind;
  label: string;
  lines: string[];
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  key?: string;
  sections: LyricSection[];
};

export type Slide = {
  id: string;
  sectionId: string;
  sectionLabel: string;
  kind: SectionKind;
  lines: string[];
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
};

export type PrimaVistaAPI = {
  openPresentation: () => Promise<boolean>;
  closePresentation: () => Promise<boolean>;
  togglePresentationFullscreen: () => Promise<boolean>;
  setSlide: (payload: SlidePayload) => void;
  getSlide: () => Promise<SlidePayload>;
  onSlideUpdate: (callback: (payload: SlidePayload) => void) => () => void;
  onPresentationClosed: (callback: () => void) => () => void;
  loadSongs: () => Promise<Song[] | null>;
  saveSongs: (songs: Song[]) => Promise<boolean>;
};

declare global {
  interface Window {
    primaVista?: PrimaVistaAPI;
  }
}
