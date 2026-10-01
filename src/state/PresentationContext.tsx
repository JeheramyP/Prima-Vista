import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { songThemeId, type StageThemeId } from "../lib/stageThemes";
import { draftToSong, EMPTY_DRAFT, songToDraft, songToSlides } from "../lib/slides";
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

const PROVISIONAL_REUSE_MS = 1000;

let provisionalNewSong: { id: string; createdAt: number } | null = null;
let newSongSerial = 0;

function isUntouchedBlank(song: Song) {
  return song.title === "Untitled" && !song.artist && !song.key && song.sections.length === 0;
}

function writeDraftOntoSong(song: Song, draft: SongDraft) {
  const next = draftToSong(song.id, draft);
  const changed =
    song.title !== next.title ||
    song.artist !== next.artist ||
    song.key !== next.key ||
    JSON.stringify(song.sections) !== JSON.stringify(next.sections);
  if (!changed) return false;
  song.title = next.title;
  song.artist = next.artist;
  song.key = next.key;
  song.sections = next.sections;
  return true;
}

type SlidePosition = "first" | "last";

type ShowSongOptions = { keepScreen?: boolean };

export type SetlistItem = { entry: SetlistEntry; song: Song };

export type UpcomingSlide = { slide: Slide; songTitle?: string; theme: StageThemeId };

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
  selectSetlistEntry: (entryId: string, position?: SlidePosition, options?: ShowSongOptions) => void;
  setQuery: (value: string) => void;
  selectSong: (song: Song) => Promise<void>;
  createNewSong: () => void;
  deleteSong: (id: string) => Promise<void>;
  setDraft: Dispatch<SetStateAction<SongDraft>>;
  applyEditor: () => Promise<void>;
  setSongTheme: (theme: StageThemeId) => void;
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
  const [draft, setDraftState] = useState<SongDraft>(
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
  const [draftRevision, setDraftRevision] = useState(0);
  const [libraryReady, setLibraryReady] = useState(false);
  const [setlistEntries, setSetlistEntries] = useState<SetlistEntry[]>(loadSetlist);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const activeSongRef = useRef(activeSong);
  activeSongRef.current = activeSong;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const selectionTouchedRef = useRef(false);
  const libraryReadyRef = useRef(false);
  libraryReadyRef.current = libraryReady;
  const pendingNewIdRef = useRef<string | null>(null);
  const mirroredNewIdsRef = useRef<Set<string>>(new Set());
  const persistTimerRef = useRef<number | null>(null);
  const setDraft = useCallback<Dispatch<SetStateAction<SongDraft>>>((value) => {
    selectionTouchedRef.current = true;
    setDraftState(value);
  }, []);

  const cancelPendingPersist = useCallback(() => {
    if (persistTimerRef.current === null) return;
    window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = null;
  }, []);

  const flushPendingNewSong = useCallback(() => {
    cancelPendingPersist();
    const current = activeSongRef.current;
    if (!current || !mirroredNewIdsRef.current.has(current.id)) return;
    const song = SONG_LIBRARY.find((candidate) => candidate.id === current.id);
    if (!song) return;
    writeDraftOntoSong(song, draftRef.current);
    if (libraryReadyRef.current) void saveSong(song);
  }, [cancelPendingPersist]);

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
      const pendingCurrent = activeSongRef.current;
      if (pendingCurrent && mirroredNewIdsRef.current.has(pendingCurrent.id)) {
        const pendingId = pendingCurrent.id;
        const restored = draftToSong(pendingId, draftRef.current);
        if (pendingCurrent.theme) restored.theme = pendingCurrent.theme;
        const index = SONG_LIBRARY.findIndex((song) => song.id === pendingId);
        if (index === -1) {
          SONG_LIBRARY.push(restored);
          songs.push(restored);
        } else {
          writeDraftOntoSong(SONG_LIBRARY[index], draftRef.current);
          if (pendingCurrent.theme) SONG_LIBRARY[index].theme = pendingCurrent.theme;
          if (!songs.some((song) => song.id === pendingId)) songs.push(SONG_LIBRARY[index]);
        }
        void saveSong(SONG_LIBRARY.find((song) => song.id === pendingId) ?? restored);
      }
      const first = songs[0] ?? null;
      if (selectionTouchedRef.current) {
        const current = activeSongRef.current;
        const fresh = current ? songs.find((song) => song.id === current.id) : undefined;
        const draftUntouched =
          !!current && JSON.stringify(draftRef.current) === JSON.stringify(songToDraft(current));
        if (fresh && draftUntouched) {
          const songSlides = songToSlides(fresh);
          setActiveSong(fresh);
          setDraftState(songToDraft(fresh));
          setSlides(songSlides);
          setCurrentIndex(
            Math.min(currentIndexRef.current, Math.max(0, songSlides.length - 1)),
          );
        }
      } else {
        setActiveSong(first);
        setDraftState(first ? songToDraft(first) : EMPTY_DRAFT);
        setSlides(first ? songToSlides(first) : []);
        setCurrentIndex(0);
      }
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

  useLayoutEffect(() => {
    const id = activeSong?.id;
    if (!id || !mirroredNewIdsRef.current.has(id)) return;
    const song = SONG_LIBRARY.find((candidate) => candidate.id === id);
    if (!song) return;
    const changed = writeDraftOntoSong(song, draft);
    if (changed) {
      setDraftRevision((revision) => revision + 1);
      setSlides((currentSlides) => {
        const first = currentSlides[0];
        if (!first?.titleSlide) return currentSlides;
        const author = song.artist.trim();
        if (first.lines[0] === song.title && (first.author ?? "") === author) return currentSlides;
        return [{ ...first, lines: [song.title], author: author || undefined }, ...currentSlides.slice(1)];
      });
      setResults((current) => current.map((row) => (row.id === id ? song : row)));
    }
    if (!libraryReadyRef.current) return;
    cancelPendingPersist();
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      if (!mirroredNewIdsRef.current.has(id)) return;
      const latest = SONG_LIBRARY.find((candidate) => candidate.id === id);
      if (latest) void saveSong(latest);
    }, 300);
    return () => cancelPendingPersist();
  }, [activeSong, cancelPendingPersist, draft]);

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
      theme: songThemeId(activeSong),
      titleSlide: currentSlide?.titleSlide ?? false,
    }),
    [activeSong, currentSlide, currentIndex, slides.length, blackout, clear, draftRevision],
  );

  useEffect(() => {
    window.primaVista?.setSlide(payload);
  }, [payload]);

  useEffect(() => {
    return window.primaVista?.onPresentationClosed(() => {
      setPresentationOpen(false);
    });
  }, []);

  const showSong = useCallback(
    (song: Song, position: SlidePosition = "first", options?: ShowSongOptions) => {
      flushPendingNewSong();
      const fresh = SONG_LIBRARY.find((candidate) => candidate.id === song.id) ?? song;
      selectionTouchedRef.current = true;
      const songSlides = songToSlides(fresh);
      const nextIndex = position === "last" ? Math.max(0, songSlides.length - 1) : 0;
      setActiveSong(fresh);
      setDraftState(songToDraft(fresh));
      setSlides(songSlides);
      setCurrentIndex(nextIndex);
      if (!options?.keepScreen) {
        setClear(false);
        setBlackout(false);
      }
    },
    [flushPendingNewSong],
  );

  const selectSong = useCallback(
    async (song: Song) => {
      selectionTouchedRef.current = true;
      if (activeSongRef.current?.id === song.id) {
        setActiveEntryId(null);
        return;
      }
      const full = (await getSongById(song.id)) ?? song;
      setActiveEntryId(null);
      showSong(full);
    },
    [showSong],
  );

  const selectSetlistEntry = useCallback(
    (entryId: string, position: SlidePosition = "first", options?: ShowSongOptions) => {
      const item = setlist.find((candidate) => candidate.entry.id === entryId);
      if (!item) return;
      setActiveEntryId(entryId);
      showSong(item.song, position, options);
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
    const theme = songThemeId(activeSong);
    const inSong = slides[currentIndex + 1];
    if (inSong) return { slide: inSong, theme };
    if (!nextSetlistItem) return null;
    const first = songToSlides(nextSetlistItem.song)[0];
    return first
      ? { slide: first, songTitle: nextSetlistItem.song.title, theme: songThemeId(nextSetlistItem.song) }
      : null;
  }, [activeSong, slides, currentIndex, nextSetlistItem]);

  const adoptSong = useCallback((song: Song) => {
    pendingNewIdRef.current = song.id;
    mirroredNewIdsRef.current.add(song.id);
    selectionTouchedRef.current = true;
    activeSongRef.current = song;
    const nextDraft = songToDraft(song);
    draftRef.current = nextDraft;
    setActiveEntryId(null);
    setActiveSong(song);
    setDraftState(nextDraft);
    setSlides(songToSlides(song));
    setCurrentIndex(0);
    setClear(false);
    setBlackout(false);
    setQuery("");
    setResults((current) =>
      current.some((candidate) => candidate.id === song.id) ? current : [...current, song],
    );
  }, []);

  const createNewSong = useCallback(() => {
    const provisional = provisionalNewSong
      ? SONG_LIBRARY.find((song) => song.id === provisionalNewSong?.id)
      : undefined;
    if (
      provisional &&
      isUntouchedBlank(provisional) &&
      Date.now() - (provisionalNewSong?.createdAt ?? 0) < PROVISIONAL_REUSE_MS &&
      !selectionTouchedRef.current
    ) {
      adoptSong(provisional);
      return;
    }

    flushPendingNewSong();
    const blank: Song = {
      id: `custom-${Date.now()}-${newSongSerial++}`,
      title: "Untitled",
      artist: "",
      sections: [],
    };
    provisionalNewSong = { id: blank.id, createdAt: Date.now() };
    pendingNewIdRef.current = blank.id;
    mirroredNewIdsRef.current.add(blank.id);
    selectionTouchedRef.current = true;
    activeSongRef.current = blank;
    draftRef.current = songToDraft(blank);
    setActiveEntryId(null);
    setActiveSong(blank);
    setDraftState(draftRef.current);
    setSlides(songToSlides(blank));
    setCurrentIndex(0);
    setClear(false);
    setBlackout(false);
    setQuery("");
    SONG_LIBRARY.push(blank);
    setResults((current) =>
      current.some((song) => song.id === blank.id) ? current : [...current, blank],
    );
    setLibraryVersion((version) => version + 1);
    if (libraryReadyRef.current) void saveSong(blank);
  }, [adoptSong, flushPendingNewSong]);

  const deleteSong = useCallback(
    async (id: string) => {
      if (pendingNewIdRef.current === id) pendingNewIdRef.current = null;
      if (mirroredNewIdsRef.current.has(id)) {
        mirroredNewIdsRef.current.delete(id);
        cancelPendingPersist();
      }
      await deleteSongFromLibrary(id);
      setSetlistEntries((entries) => entries.filter((entry) => entry.songId !== id));
      if (activeSong?.id === id) {
        setActiveEntryId(null);
        const fallback = SONG_LIBRARY[0] ?? null;
        setActiveSong(fallback);
        setDraftState(fallback ? songToDraft(fallback) : EMPTY_DRAFT);
        setSlides(fallback ? songToSlides(fallback) : []);
        setCurrentIndex(0);
        setClear(false);
        setBlackout(false);
      }
      setLibraryVersion((version) => version + 1);
    },
    [activeSong?.id, cancelPendingPersist],
  );

  const setSongTheme = useCallback((theme: StageThemeId) => {
    if (!activeSong) return;
    const next = { ...activeSong, theme };
    setActiveSong(next);
    const index = SONG_LIBRARY.findIndex((song) => song.id === next.id);
    if (index === -1) return;
    SONG_LIBRARY[index] = next;
    void saveSong(next).then(() => {
      setLibraryVersion((version) => version + 1);
    });
  }, [activeSong]);

  const applyEditor = useCallback(async () => {
    const nextSong = draftToSong(activeSong?.id ?? `custom-${Date.now()}`, draft);
    if (activeSong?.theme) nextSong.theme = activeSong.theme;
    const nextSlides = songToSlides(nextSong);
    const previousSlides = slidesRef.current;
    const previousIndex = currentIndexRef.current;
    const previousId = previousSlides[previousIndex]?.id;
    const matched = previousId ? nextSlides.findIndex((slide) => slide.id === previousId) : -1;
    const nextIndex =
      matched !== -1
        ? matched
        : Math.min(previousIndex, Math.max(0, nextSlides.length - 1));
    setActiveSong(nextSong);
    setDraftState(songToDraft(nextSong));
    setSlides(nextSlides);
    setCurrentIndex(nextIndex);
    await saveSong(nextSong);
    setLibraryVersion((version) => version + 1);
  }, [activeSong, draft]);

  const goTo = useCallback(
    (index: number) => {
      if (!slides.length) return;
      const next = Math.max(0, Math.min(slides.length - 1, index));
      setCurrentIndex(next);
    },
    [slides.length],
  );

  const next = useCallback(() => {
    if (currentIndex >= slides.length - 1 && nextSetlistItem) {
      selectSetlistEntry(nextSetlistItem.entry.id, "first", { keepScreen: true });
      return;
    }
    goTo(currentIndex + 1);
  }, [currentIndex, goTo, nextSetlistItem, selectSetlistEntry, slides.length]);

  const prev = useCallback(() => {
    if (currentIndex <= 0 && prevSetlistItem) {
      selectSetlistEntry(prevSetlistItem.entry.id, "last", { keepScreen: true });
      return;
    }
    goTo(currentIndex - 1);
  }, [currentIndex, goTo, prevSetlistItem, selectSetlistEntry]);

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
      setSongTheme,
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
      setDraft,
      applyEditor,
      setSongTheme,
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
