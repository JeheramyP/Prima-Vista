import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { parseEditorText, sectionsToSlides, songToEditorText, songToSlides } from "../lib/slides";
import { getSongById, saveSong, searchSongs, SONG_LIBRARY } from "../lib/songs";
import type { Slide, SlidePayload, Song } from "../types";

type PresentationState = {
  query: string;
  results: Song[];
  searching: boolean;
  activeSong: Song | null;
  editorText: string;
  slides: Slide[];
  currentIndex: number;
  blackout: boolean;
  clear: boolean;
  presentationOpen: boolean;
  setQuery: (value: string) => void;
  selectSong: (song: Song) => Promise<void>;
  createNewSong: () => void;
  setEditorText: (value: string) => void;
  applyEditor: () => Promise<void>;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  setBlackout: (value: boolean) => void;
  setClear: (value: boolean) => void;
  openPresentation: () => Promise<void>;
  closePresentation: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
};

const PresentationContext = createContext<PresentationState | null>(null);

export function PresentationProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>(SONG_LIBRARY);
  const [searching, setSearching] = useState(false);
  const [activeSong, setActiveSong] = useState<Song | null>(SONG_LIBRARY[0] ?? null);
  const [editorText, setEditorText] = useState(
    SONG_LIBRARY[0] ? songToEditorText(SONG_LIBRARY[0]) : "",
  );
  const [slides, setSlides] = useState<Slide[]>(
    SONG_LIBRARY[0] ? songToSlides(SONG_LIBRARY[0]) : [],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [blackout, setBlackout] = useState(false);
  const [clear, setClear] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [libraryVersion, setLibraryVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSearching(true);
    const handle = window.setTimeout(async () => {
      const songs = await searchSongs(query);
      if (!cancelled) {
        setResults(songs);
        setSearching(false);
      }
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, libraryVersion]);

  const currentSlide = slides[currentIndex];

  const payload = useMemo<SlidePayload>(
    () => ({
      songTitle: activeSong?.title ?? "",
      artist: activeSong?.artist ?? "",
      sectionLabel: currentSlide?.sectionLabel ?? "",
      lines: currentSlide?.lines ?? [],
      index: currentIndex,
      total: slides.length,
      blackout,
      clear,
    }),
    [activeSong, currentSlide, currentIndex, slides.length, blackout, clear],
  );

  useEffect(() => {
    window.primaVista?.setSlide(payload);
  }, [payload]);

  useEffect(() => {
    return window.primaVista?.onPresentationClosed(() => {
      setPresentationOpen(false);
    });
  }, []);

  const selectSong = useCallback(async (song: Song) => {
    const full = (await getSongById(song.id)) ?? song;
    setActiveSong(full);
    setEditorText(songToEditorText(full));
    setSlides(songToSlides(full));
    setCurrentIndex(0);
    setClear(false);
    setBlackout(false);
  }, []);

  const createNewSong = useCallback(() => {
    const blank: Song = {
      id: `custom-${Date.now()}`,
      title: "Untitled",
      artist: "",
      sections: [{ id: "new-1", kind: "verse", label: "Verse 1", lines: [] }],
    };
    setActiveSong(blank);
    setEditorText(songToEditorText(blank));
    setSlides(songToSlides(blank));
    setCurrentIndex(0);
    setClear(false);
    setBlackout(false);
  }, []);

  const applyEditor = useCallback(async () => {
    const parsed = parseEditorText(editorText);
    const nextSong: Song = {
      id: activeSong?.id ?? `custom-${Date.now()}`,
      title: parsed.title,
      artist: parsed.artist,
      key: parsed.key,
      sections: parsed.sections,
    };
    setActiveSong(nextSong);
    setSlides(sectionsToSlides(parsed.sections));
    setCurrentIndex(0);
    await saveSong(nextSong);
    setLibraryVersion((version) => version + 1);
  }, [activeSong?.id, editorText]);

  const goTo = useCallback(
    (index: number) => {
      if (!slides.length) return;
      const next = Math.max(0, Math.min(slides.length - 1, index));
      setCurrentIndex(next);
      setClear(false);
      setBlackout(false);
    },
    [slides.length],
  );

  const next = useCallback(() => {
    if (blackout) {
      setBlackout(false);
      return;
    }
    if (clear) {
      setClear(false);
      return;
    }
    goTo(currentIndex + 1);
  }, [blackout, clear, currentIndex, goTo]);

  const prev = useCallback(() => {
    if (blackout) {
      setBlackout(false);
      return;
    }
    if (clear) {
      setClear(false);
      return;
    }
    goTo(currentIndex - 1);
  }, [blackout, clear, currentIndex, goTo]);

  const openPresentation = useCallback(async () => {
    await window.primaVista?.openPresentation();
    setPresentationOpen(true);
    window.primaVista?.setSlide(payload);
  }, [payload]);

  const closePresentation = useCallback(async () => {
    await window.primaVista?.closePresentation();
    setPresentationOpen(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    await window.primaVista?.togglePresentationFullscreen();
  }, []);

  const value = useMemo<PresentationState>(
    () => ({
      query,
      results,
      searching,
      activeSong,
      editorText,
      slides,
      currentIndex,
      blackout,
      clear,
      presentationOpen,
      setQuery,
      selectSong,
      createNewSong,
      setEditorText,
      applyEditor,
      goTo,
      next,
      prev,
      setBlackout,
      setClear,
      openPresentation,
      closePresentation,
      toggleFullscreen,
    }),
    [
      query,
      results,
      searching,
      activeSong,
      editorText,
      slides,
      currentIndex,
      blackout,
      clear,
      presentationOpen,
      selectSong,
      createNewSong,
      applyEditor,
      goTo,
      next,
      prev,
      openPresentation,
      closePresentation,
      toggleFullscreen,
    ],
  );

  return createElement(PresentationContext.Provider, { value }, children);
}

export function usePresentation() {
  const ctx = useContext(PresentationContext);
  if (!ctx) {
    throw new Error("usePresentation must be used within PresentationProvider");
  }
  return ctx;
}
