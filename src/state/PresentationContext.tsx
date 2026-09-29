import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { draftToSong, EMPTY_DRAFT, sectionsToSlides, songToDraft, songToSlides } from "../lib/slides";
import {
  deleteSong as deleteSongFromLibrary,
  getSongById,
  loadLibrary,
  saveSong,
  searchSongs,
  SONG_LIBRARY,
} from "../lib/songs";
import { createEntry, loadSetlist, saveSetlist } from "../lib/setlist";
import type { SetlistEntry, Slide, SlidePayload, Song, SongDraft } from "../types";

type SlidePosition = "first" | "last";

export type SetlistItem = { entry: SetlistEntry; song: Song };

export type UpcomingSlide = { slide: Slide; songTitle?: string };

type PresentationState = {
  query: string;
  results: Song[];
  searching: boolean;
  activeSong: Song | null;
  draft: SongDraft;
  slides: Slide[];
  currentIndex: number;
  blackout: boolean;
  clear: boolean;
  presentationOpen: boolean;
  setlist: SetlistItem[];
  activeEntryId: string | null;
  upcoming: UpcomingSlide | null;
  addToSetlist: (songId: string, index?: number) => void;
  removeFromSetlist: (entryId: string) => void;
  moveSetlistEntry: (entryId: string, toIndex: number) => void;
  clearSetlist: () => void;
  selectSetlistEntry: (entryId: string, position?: SlidePosition) => void;
  setQuery: (value: string) => void;
  selectSong: (song: Song) => Promise<void>;
  createNewSong: () => void;
  deleteSong: (id: string) => Promise<void>;
  setDraft: Dispatch<SetStateAction<SongDraft>>;
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
  const [draft, setDraft] = useState<SongDraft>(
    SONG_LIBRARY[0] ? songToDraft(SONG_LIBRARY[0]) : EMPTY_DRAFT,
  );
  const [slides, setSlides] = useState<Slide[]>(
    SONG_LIBRARY[0] ? songToSlides(SONG_LIBRARY[0]) : [],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [blackout, setBlackout] = useState(false);
  const [clear, setClear] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [libraryReady, setLibraryReady] = useState(false);
  const [setlistEntries, setSetlistEntries] = useState<SetlistEntry[]>(loadSetlist);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  useEffect(() => {
    saveSetlist(setlistEntries);
  }, [setlistEntries]);

  useEffect(() => {
    if (!libraryReady) return;
    const known = new Set(SONG_LIBRARY.map((song) => song.id));
    setSetlistEntries((entries) => {
      const kept = entries.filter((entry) => known.has(entry.songId));
      return kept.length === entries.length ? entries : kept;
    });
  }, [libraryReady, libraryVersion]);

  const setlist = useMemo<SetlistItem[]>(() => {
    const items: SetlistItem[] = [];
    for (const entry of setlistEntries) {
      const song = SONG_LIBRARY.find((candidate) => candidate.id === entry.songId);
      if (song) items.push({ entry, song });
    }
    return items;
    // SONG_LIBRARY is mutated in place; libraryVersion signals those changes.
  }, [setlistEntries, libraryVersion]);

  const activeSetlistIndex = setlist.findIndex((item) => item.entry.id === activeEntryId);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const songs = await loadLibrary();
      if (cancelled) return;
      const first = songs[0] ?? null;
      setActiveSong(first);
      setDraft(first ? songToDraft(first) : EMPTY_DRAFT);
      setSlides(first ? songToSlides(first) : []);
      setCurrentIndex(0);
      setLibraryReady(true);
      setLibraryVersion((version) => version + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!libraryReady) return;
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
  }, [query, libraryVersion, libraryReady]);

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

  const showSong = useCallback((song: Song, position: SlidePosition = "first") => {
    const songSlides = songToSlides(song);
    setActiveSong(song);
    setDraft(songToDraft(song));
    setSlides(songSlides);
    setCurrentIndex(position === "last" ? Math.max(0, songSlides.length - 1) : 0);
    setClear(false);
    setBlackout(false);
  }, []);

  const selectSong = useCallback(
    async (song: Song) => {
      const full = (await getSongById(song.id)) ?? song;
      setActiveEntryId(null);
      showSong(full);
    },
    [showSong],
  );

  const selectSetlistEntry = useCallback(
    (entryId: string, position: SlidePosition = "first") => {
      const item = setlist.find((candidate) => candidate.entry.id === entryId);
      if (!item) return;
      setActiveEntryId(entryId);
      showSong(item.song, position);
    },
    [setlist, showSong],
  );

  const addToSetlist = useCallback((songId: string, index?: number) => {
    setSetlistEntries((entries) => {
      const nextEntries = [...entries];
      const at = index === undefined ? entries.length : Math.max(0, Math.min(entries.length, index));
      nextEntries.splice(at, 0, createEntry(songId));
      return nextEntries;
    });
  }, []);

  const removeFromSetlist = useCallback((entryId: string) => {
    setSetlistEntries((entries) => entries.filter((entry) => entry.id !== entryId));
    setActiveEntryId((current) => (current === entryId ? null : current));
  }, []);

  const moveSetlistEntry = useCallback((entryId: string, toIndex: number) => {
    setSetlistEntries((entries) => {
      const from = entries.findIndex((entry) => entry.id === entryId);
      if (from === -1) return entries;
      // toIndex is an insertion point measured before the entry is removed.
      const target = Math.max(0, Math.min(entries.length, toIndex));
      const adjusted = from < target ? target - 1 : target;
      if (adjusted === from) return entries;
      const nextEntries = [...entries];
      const [moved] = nextEntries.splice(from, 1);
      nextEntries.splice(adjusted, 0, moved);
      return nextEntries;
    });
  }, []);

  const clearSetlist = useCallback(() => {
    setSetlistEntries([]);
    setActiveEntryId(null);
  }, []);

  const nextSetlistItem = activeSetlistIndex === -1 ? undefined : setlist[activeSetlistIndex + 1];
  const prevSetlistItem = activeSetlistIndex > 0 ? setlist[activeSetlistIndex - 1] : undefined;

  const upcoming = useMemo<UpcomingSlide | null>(() => {
    const inSong = slides[currentIndex + 1];
    if (inSong) return { slide: inSong };
    if (!nextSetlistItem) return null;
    const first = songToSlides(nextSetlistItem.song)[0];
    return first ? { slide: first, songTitle: nextSetlistItem.song.title } : null;
  }, [slides, currentIndex, nextSetlistItem]);

  const createNewSong = useCallback(() => {
    const blank: Song = {
      id: `custom-${Date.now()}`,
      title: "Untitled",
      artist: "",
      sections: [],
    };
    setActiveEntryId(null);
    setActiveSong(blank);
    setDraft(songToDraft(blank));
    setSlides(songToSlides(blank));
    setCurrentIndex(0);
    setClear(false);
    setBlackout(false);
  }, []);

  const deleteSong = useCallback(
    async (id: string) => {
      await deleteSongFromLibrary(id);
      setSetlistEntries((entries) => entries.filter((entry) => entry.songId !== id));
      if (activeSong?.id === id) {
        setActiveEntryId(null);
        const fallback = SONG_LIBRARY[0] ?? null;
        setActiveSong(fallback);
        setDraft(fallback ? songToDraft(fallback) : EMPTY_DRAFT);
        setSlides(fallback ? songToSlides(fallback) : []);
        setCurrentIndex(0);
        setClear(false);
        setBlackout(false);
      }
      setLibraryVersion((version) => version + 1);
    },
    [activeSong?.id],
  );

  const applyEditor = useCallback(async () => {
    const nextSong = draftToSong(activeSong?.id ?? `custom-${Date.now()}`, draft);
    setActiveSong(nextSong);
    setDraft(songToDraft(nextSong));
    setSlides(sectionsToSlides(nextSong.sections));
    setCurrentIndex(0);
    await saveSong(nextSong);
    setLibraryVersion((version) => version + 1);
  }, [activeSong?.id, draft]);

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
    if (currentIndex >= slides.length - 1 && nextSetlistItem) {
      selectSetlistEntry(nextSetlistItem.entry.id, "first");
      return;
    }
    goTo(currentIndex + 1);
  }, [blackout, clear, currentIndex, goTo, nextSetlistItem, selectSetlistEntry, slides.length]);

  const prev = useCallback(() => {
    if (blackout) {
      setBlackout(false);
      return;
    }
    if (clear) {
      setClear(false);
      return;
    }
    if (currentIndex <= 0 && prevSetlistItem) {
      selectSetlistEntry(prevSetlistItem.entry.id, "last");
      return;
    }
    goTo(currentIndex - 1);
  }, [blackout, clear, currentIndex, goTo, prevSetlistItem, selectSetlistEntry]);

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
      draft,
      slides,
      currentIndex,
      blackout,
      clear,
      presentationOpen,
      setlist,
      activeEntryId,
      upcoming,
      addToSetlist,
      removeFromSetlist,
      moveSetlistEntry,
      clearSetlist,
      selectSetlistEntry,
      setQuery,
      selectSong,
      createNewSong,
      deleteSong,
      setDraft,
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
      draft,
      slides,
      currentIndex,
      blackout,
      clear,
      presentationOpen,
      setlist,
      activeEntryId,
      upcoming,
      addToSetlist,
      removeFromSetlist,
      moveSetlistEntry,
      clearSetlist,
      selectSetlistEntry,
      selectSong,
      createNewSong,
      deleteSong,
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
