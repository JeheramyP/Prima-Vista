/**
 * Controller state.
 *
 * Mounted only on the `#/` route. Holds the selected song, the editor draft,
 * the derived slide list, blackout and clear, the setlist, and theme edits.
 * Every change that should appear on the projector is folded into a
 * `SlidePayload` and sent through `window.primaVista.setSlide`.
 *
 * `SONG_LIBRARY` is mutated in place. `libraryVersion` is the signal that
 * tells React those mutations happened. A new song's draft is written back
 * as the operator types (`mirroredNewIdsRef`). Songs already in the library
 * wait for `applyEditor` ("Update slides").
 */
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
import { isDefaultThemeId, songThemeId, type CustomThemeRecord, type StageThemeId } from "../lib/stageThemes";
import {
  CUSTOM_THEMES,
  customThemeRecord,
  deleteCustomTheme as deleteCustomThemeFromLibrary,
  loadCustomThemes,
  resetDefaultThemes as resetStoredDefaultThemes,
  saveCustomTheme,
} from "../lib/customThemes";
import { draftToSong, EMPTY_DRAFT, scriptureToSlides, songToDraft, songToSlides } from "../lib/slides";
import {
  deleteSong as deleteSongFromLibrary,
  getSongById,
  loadLibrary,
  saveSong,
  searchSongs,
  SONG_LIBRARY,
} from "../lib/songs";
import { createEntry, createScriptureEntry, isScriptureEntry, loadSetlist, saveSetlist } from "../lib/setlist";
import type { ScriptureSetlistEntry, SetlistEntry, Slide, SlidePayload, Song, SongDraft } from "../types";

const PROVISIONAL_REUSE_MS = 1000;

let provisionalNewSong: { id: string; createdAt: number } | null = null;
let newSongSerial = 0;

/** The controller banner reports the failure; callers still update in-memory state. */
function settleSave(work: Promise<unknown>) {
  void work.catch(() => undefined);
}

function isUntouchedBlank(song: Song) {
  return (
    song.title === "Untitled" &&
    !song.artist &&
    !song.key &&
    !song.ccli &&
    !song.copyright &&
    song.sections.length === 0
  );
}

function writeDraftOntoSong(song: Song, draft: SongDraft) {
  const next = draftToSong(song.id, draft);
  const changed =
    song.title !== next.title ||
    song.artist !== next.artist ||
    song.key !== next.key ||
    song.ccli !== next.ccli ||
    song.copyright !== next.copyright ||
    JSON.stringify(song.sections) !== JSON.stringify(next.sections);
  if (!changed) return false;
  song.title = next.title;
  song.artist = next.artist;
  song.key = next.key;
  song.ccli = next.ccli;
  song.copyright = next.copyright;
  song.sections = next.sections;
  return true;
}

type SlidePosition = "first" | "last";

type ShowSongOptions = { keepScreen?: boolean };

export type SetlistItem =
  | { kind: "song"; entry: SetlistEntry & { songId: string }; song: Song }
  | { kind: "scripture"; entry: ScriptureSetlistEntry };

export type UpcomingSlide = { slide: Slide; songTitle?: string; theme: StageThemeId };

/** First cue of a setlist row: a song's title slide, or the first scripture slide. */
function openingCue(item: SetlistItem): UpcomingSlide | null {
  if (item.kind === "scripture") {
    const slide = scriptureToSlides(item.entry)[0];
    return slide ? { slide, theme: songThemeId(item.entry) } : null;
  }
  const slide = songToSlides(item.song)[0];
  return slide
    ? { slide, songTitle: item.song.title, theme: songThemeId(item.song) }
    : null;
}

type PresentationState = {
  query: string;
  results: Song[];
  searching: boolean;
  updatingSlides: boolean;
  activeSong: Song | null;
  draft: SongDraft;
  slides: Slide[];
  currentIndex: number;
  blackout: boolean;
  clear: boolean;
  presentationOpen: boolean;
  presentationFullscreen: boolean;
  setlist: SetlistItem[];
  activeEntryId: string | null;
  /** The scripture row on screen, when that row is still in the setlist. */
  activeScripture: ScriptureSetlistEntry | null;
  /** Live slides are a scripture reading, so the song editor stays out of the way. */
  presentingScripture: boolean;
  upcoming: UpcomingSlide | null;
  addToSetlist: (songId: string, index?: number) => void;
  /** Inserts a blank scripture slide at `index` and makes it the live cue. */
  addScriptureToSetlist: (index?: number) => void;
  updateScripture: (entryId: string, patch: { reference?: string; text?: string; theme?: StageThemeId }) => void;
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
  customThemes: CustomThemeRecord[];
  /** Saved edits of the built-in themes. Absent themes still use the original look. */
  defaultOverrides: CustomThemeRecord[];
  /** Saves the theme and applies it to the selected song. */
  addCustomTheme: (theme: CustomThemeRecord) => Promise<void>;
  deleteCustomTheme: (id: string) => Promise<void>;
  /** Restores every edited built-in theme. Custom themes are left as they are. */
  resetDefaultThemes: () => Promise<void>;
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
  const [updatingSlides, setUpdatingSlides] = useState(false);
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
  const [presentationFullscreen, setPresentationFullscreen] = useState(false);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [draftRevision, setDraftRevision] = useState(0);
  const [libraryReady, setLibraryReady] = useState(false);
  const [setlistEntries, setSetlistEntries] = useState<SetlistEntry[]>(loadSetlist);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [presentingScripture, setPresentingScripture] = useState(false);
  const [savedThemes, setSavedThemes] = useState<CustomThemeRecord[]>([]);
  const customThemes = useMemo(
    () => savedThemes.filter((theme) => !isDefaultThemeId(theme.id)),
    [savedThemes],
  );
  const defaultOverrides = useMemo(
    () => savedThemes.filter((theme) => isDefaultThemeId(theme.id)),
    [savedThemes],
  );
  const activeSongRef = useRef(activeSong);
  activeSongRef.current = activeSong;
  const presentingScriptureRef = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const selectionTouchedRef = useRef(false);
  /** Edits to the current provisional blank. Inserting that blank does not set this. */
  const provisionalEditedRef = useRef(false);
  const libraryReadyRef = useRef(false);
  libraryReadyRef.current = libraryReady;
  const pendingNewIdRef = useRef<string | null>(null);
  const mirroredNewIdsRef = useRef<Set<string>>(new Set());
  const persistTimerRef = useRef<number | null>(null);
  const updatingSlidesTimerRef = useRef<number | null>(null);
  const setDraft = useCallback<Dispatch<SetStateAction<SongDraft>>>((value) => {
    selectionTouchedRef.current = true;
    if (provisionalNewSong && activeSongRef.current?.id === provisionalNewSong.id) {
      provisionalEditedRef.current = true;
    }
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
    if (libraryReadyRef.current) settleSave(saveSong(song));
  }, [cancelPendingPersist]);

  useEffect(() => {
    saveSetlist(setlistEntries);
  }, [setlistEntries]);

  useEffect(() => {
    if (!libraryReady) return;
    const known = new Set(SONG_LIBRARY.map((song) => song.id));
    setSetlistEntries((entries) => {
      const kept = entries.filter((entry) => isScriptureEntry(entry) || known.has(entry.songId));
      return kept.length === entries.length ? entries : kept;
    });
  }, [libraryReady, libraryVersion]);

  const setlist = useMemo<SetlistItem[]>(() => {
    const items: SetlistItem[] = [];
    for (const entry of setlistEntries) {
      if (isScriptureEntry(entry)) {
        items.push({ kind: "scripture", entry });
        continue;
      }
      const song = SONG_LIBRARY.find((candidate) => candidate.id === entry.songId);
      if (song) items.push({ kind: "song", entry, song });
    }
    return items;
    // SONG_LIBRARY is mutated in place; libraryVersion signals those changes.
  }, [setlistEntries, libraryVersion]);

  const activeScripture = useMemo(() => {
    if (!presentingScripture || !activeEntryId) return null;
    const item = setlist.find((candidate) => candidate.entry.id === activeEntryId);
    return item?.kind === "scripture" ? item.entry : null;
  }, [presentingScripture, activeEntryId, setlist]);

  useEffect(() => {
    if (!activeScripture) return;
    const nextSlides = scriptureToSlides(activeScripture);
    setSlides((current) => {
      const same =
        current.length === nextSlides.length &&
        current.every((slide, index) => {
          const next = nextSlides[index];
          return (
            slide.id === next?.id &&
            slide.reference === next?.reference &&
            slide.lines.join("\n") === next?.lines.join("\n")
          );
        });
      return same ? current : nextSlides;
    });
    setCurrentIndex((index) => Math.min(index, Math.max(0, nextSlides.length - 1)));
  }, [activeScripture]);

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
        settleSave(saveSong(SONG_LIBRARY.find((song) => song.id === pendingId) ?? restored));
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
    let cancelled = false;
    void loadCustomThemes().then((themes) => {
      if (!cancelled) setSavedThemes(themes);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const queryRef = useRef(query);
  queryRef.current = query;

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
  }, [query, libraryReady]);

  useEffect(() => {
    if (!libraryReady) return;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      const songs = await searchSongs(queryRef.current);
      if (!cancelled) setResults(songs);
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [libraryVersion, libraryReady]);

  useEffect(
    () => () => {
      if (updatingSlidesTimerRef.current !== null) {
        window.clearTimeout(updatingSlidesTimerRef.current);
      }
    },
    [],
  );

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
        const ccli = song.ccli?.trim() ?? "";
        const copyright = song.copyright?.trim() ?? "";
        if (
          first.lines[0] === song.title &&
          (first.author ?? "") === author &&
          (first.ccli ?? "") === ccli &&
          (first.copyright ?? "") === copyright
        ) {
          return currentSlides;
        }
        return [
          {
            ...first,
            lines: [song.title],
            author: author || undefined,
            ccli: ccli || undefined,
            copyright: copyright || undefined,
          },
          ...currentSlides.slice(1),
        ];
      });
      setResults((current) => current.map((row) => (row.id === id ? song : row)));
    }
    if (!libraryReadyRef.current) return;
    cancelPendingPersist();
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      if (!mirroredNewIdsRef.current.has(id)) return;
      const latest = SONG_LIBRARY.find((candidate) => candidate.id === id);
      if (latest) settleSave(saveSong(latest));
    }, 300);
    return () => cancelPendingPersist();
  }, [activeSong, cancelPendingPersist, draft]);

  const currentSlide = slides[currentIndex];

  /** Wire object for the output. Republished by the effect below on every change. */
  const payload = useMemo<SlidePayload>(() => {
    const theme = currentSlide?.scriptureSlide ? songThemeId(activeScripture) : songThemeId(activeSong);
    return {
      songTitle: activeSong?.title ?? "",
      artist: activeSong?.artist ?? "",
      ccli: activeSong?.ccli ?? "",
      copyright: activeSong?.copyright ?? "",
      sectionLabel: currentSlide?.sectionLabel ?? "",
      lines: currentSlide?.lines ?? [],
      index: currentIndex,
      total: slides.length,
      blackout,
      clear,
      theme,
      customTheme: customThemeRecord(theme),
      titleSlide: currentSlide?.scriptureSlide ? false : (currentSlide?.titleSlide ?? false),
      scriptureSlide: currentSlide?.scriptureSlide ?? false,
      reference: currentSlide?.reference,
    };
  }, [activeSong, activeScripture, currentSlide, currentIndex, slides.length, blackout, clear, draftRevision, savedThemes]);

  useEffect(() => {
    window.primaVista?.setSlide(payload);
  }, [payload]);

  useEffect(() => {
    const unsubscribeClosed = window.primaVista?.onPresentationClosed(() => {
      setPresentationOpen(false);
      setPresentationFullscreen(false);
    });
    const unsubscribeFullscreen = window.primaVista?.onPresentationFullscreen((fullscreen) => {
      setPresentationFullscreen(fullscreen);
    });
    return () => {
      unsubscribeClosed?.();
      unsubscribeFullscreen?.();
    };
  }, []);

  /**
   * Makes `song` the live song and rebuilds its slides.
   * `keepScreen` leaves blackout and clear as they are, which setlist advances use.
   */
  const showSong = useCallback(
    (song: Song, position: SlidePosition = "first", options?: ShowSongOptions) => {
      flushPendingNewSong();
      presentingScriptureRef.current = false;
      setPresentingScripture(false);
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

  const showScripture = useCallback(
    (entry: ScriptureSetlistEntry, position: SlidePosition = "first", options?: ShowSongOptions) => {
      flushPendingNewSong();
      selectionTouchedRef.current = true;
      presentingScriptureRef.current = true;
      setPresentingScripture(true);
      const nextSlides = scriptureToSlides(entry);
      const nextIndex = position === "last" ? Math.max(0, nextSlides.length - 1) : 0;
      setActiveSong(null);
      setSlides(nextSlides);
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
      if (item.kind === "scripture") {
        showScripture(item.entry, position, options);
        return;
      }
      showSong(item.song, position, options);
    },
    [setlist, showScripture, showSong],
  );

  const addToSetlist = useCallback((songId: string, index?: number) => {
    setSetlistEntries((entries) => {
      const nextEntries = [...entries];
      const at = index === undefined ? entries.length : Math.max(0, Math.min(entries.length, index));
      nextEntries.splice(at, 0, createEntry(songId));
      return nextEntries;
    });
  }, []);

  const addScriptureToSetlist = useCallback(
    (index?: number) => {
      const entry = createScriptureEntry();
      setSetlistEntries((entries) => {
        const nextEntries = [...entries];
        const at = index === undefined ? entries.length : Math.max(0, Math.min(entries.length, index));
        nextEntries.splice(at, 0, entry);
        return nextEntries;
      });
      setActiveEntryId(entry.id);
      showScripture(entry);
    },
    [showScripture],
  );

  const updateScripture = useCallback((entryId: string, patch: { reference?: string; text?: string; theme?: StageThemeId }) => {
    setSetlistEntries((entries) => {
      const current = entries.find((entry) => entry.id === entryId);
      if (!current || !isScriptureEntry(current)) return entries;
      const nextEntry: ScriptureSetlistEntry = {
        ...current,
        reference: patch.reference ?? current.reference,
        text: patch.text ?? current.text,
        theme: patch.theme ?? current.theme,
      };
      return entries.map((entry) => (entry.id === entryId ? nextEntry : entry));
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
    const inPassage = slides[currentIndex + 1];
    if (inPassage) {
      return {
        slide: inPassage,
        theme: inPassage.scriptureSlide ? songThemeId(activeScripture) : songThemeId(activeSong),
      };
    }
    if (!nextSetlistItem) return null;
    return openingCue(nextSetlistItem);
  }, [activeSong, activeScripture, slides, currentIndex, nextSetlistItem, savedThemes]);

  const adoptSong = useCallback((song: Song) => {
    pendingNewIdRef.current = song.id;
    mirroredNewIdsRef.current.add(song.id);
    selectionTouchedRef.current = true;
    presentingScriptureRef.current = false;
    setPresentingScripture(false);
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

  /**
   * Inserts a blank song and mirrors its draft into the library while it stays
   * selected. A second call within a second reuses that blank when its draft
   * has not been edited. The first insert still marks the selection as touched
   * so a late library load does not replace the new song.
   */
  const createNewSong = useCallback(() => {
    const provisional = provisionalNewSong
      ? SONG_LIBRARY.find((song) => song.id === provisionalNewSong?.id)
      : undefined;
    if (
      provisional &&
      isUntouchedBlank(provisional) &&
      !provisionalEditedRef.current &&
      Date.now() - (provisionalNewSong?.createdAt ?? 0) < PROVISIONAL_REUSE_MS
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
    provisionalEditedRef.current = false;
    pendingNewIdRef.current = blank.id;
    mirroredNewIdsRef.current.add(blank.id);
    selectionTouchedRef.current = true;
    presentingScriptureRef.current = false;
    setPresentingScripture(false);
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
    if (libraryReadyRef.current) settleSave(saveSong(blank));
  }, [adoptSong, flushPendingNewSong]);

  const deleteSong = useCallback(
    async (id: string) => {
      if (pendingNewIdRef.current === id) pendingNewIdRef.current = null;
      if (mirroredNewIdsRef.current.has(id)) {
        mirroredNewIdsRef.current.delete(id);
        cancelPendingPersist();
      }
      try {
        await deleteSongFromLibrary(id);
      } catch {
        // In-memory removal still applies. The controller banner reports the failed write.
      }
      setSetlistEntries((entries) =>
        entries.filter((entry) => isScriptureEntry(entry) || entry.songId !== id),
      );
      if (activeSong?.id === id) {
        setActiveEntryId(null);
        presentingScriptureRef.current = false;
        setPresentingScripture(false);
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
    if (activeScripture) {
      updateScripture(activeScripture.id, { theme });
      return;
    }
    if (!activeSong) return;
    const next = { ...activeSong, theme };
    setActiveSong(next);
    const index = SONG_LIBRARY.findIndex((song) => song.id === next.id);
    if (index === -1) return;
    SONG_LIBRARY[index] = next;
    settleSave(
      saveSong(next).finally(() => {
        setLibraryVersion((version) => version + 1);
      }),
    );
  }, [activeSong, activeScripture, updateScripture]);

  const addCustomTheme = useCallback(
    async (theme: CustomThemeRecord) => {
      const updating = isDefaultThemeId(theme.id) || CUSTOM_THEMES.some((item) => item.id === theme.id);
      // The theme is registered synchronously, before the write finishes.
      const write = saveCustomTheme(theme);
      setSavedThemes([...CUSTOM_THEMES]);
      if (!updating) setSongTheme(theme.id);
      try {
        await write;
      } catch {
        // The theme is already on screen. The controller banner reports the failed write.
      }
    },
    [setSongTheme],
  );

  const deleteCustomTheme = useCallback(async (id: string) => {
    const write = deleteCustomThemeFromLibrary(id);
    setSavedThemes([...CUSTOM_THEMES]);
    try {
      await write;
    } catch {
      // In-memory removal still applies. The controller banner reports the failed write.
    }
  }, []);

  const resetDefaultThemes = useCallback(async () => {
    const write = resetStoredDefaultThemes();
    setSavedThemes([...CUSTOM_THEMES]);
    try {
      await write;
    } catch {
      // In-memory reset still applies. The controller banner reports the failed write.
    }
  }, []);

  /**
   * "Update slides." Writes the draft onto the song, rebuilds slides, and
   * stays on the previous slide id when that id still exists.
   */
  const applyEditor = useCallback(async () => {
    if (presentingScriptureRef.current) return;
    if (updatingSlidesTimerRef.current !== null) {
      window.clearTimeout(updatingSlidesTimerRef.current);
      updatingSlidesTimerRef.current = null;
    }
    setUpdatingSlides(true);
    const startedAt = Date.now();
    try {
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
      try {
        await saveSong(nextSong);
      } catch {
        // Slides already reflect the edit. The controller banner reports the failed write.
      }
      setLibraryVersion((version) => version + 1);
    } finally {
      const remaining = Math.max(0, 700 - (Date.now() - startedAt));
      updatingSlidesTimerRef.current = window.setTimeout(() => {
        updatingSlidesTimerRef.current = null;
        setUpdatingSlides(false);
      }, remaining);
    }
  }, [activeSong, draft]);

  const goTo = useCallback(
    (index: number) => {
      if (!slides.length) return;
      const next = Math.max(0, Math.min(slides.length - 1, index));
      setCurrentIndex(next);
    },
    [slides.length],
  );

  /** Next slide, or the next setlist song's first slide when this song is finished. */
  const next = useCallback(() => {
    if (currentIndex >= slides.length - 1 && nextSetlistItem) {
      selectSetlistEntry(nextSetlistItem.entry.id, "first", { keepScreen: true });
      return;
    }
    goTo(currentIndex + 1);
  }, [currentIndex, goTo, nextSetlistItem, selectSetlistEntry, slides.length]);

  /** Previous slide, or the previous setlist song's last slide at the start of this song. */
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
    setPresentationFullscreen(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const fullscreen = await window.primaVista?.togglePresentationFullscreen();
    if (typeof fullscreen === "boolean") setPresentationFullscreen(fullscreen);
  }, []);

  const value = useMemo<PresentationState>(
    () => ({
      query,
      results,
      searching,
      updatingSlides,
      activeSong,
      draft,
      slides,
      currentIndex,
      blackout,
      clear,
      presentationOpen,
      presentationFullscreen,
      setlist,
      activeEntryId,
      activeScripture,
      presentingScripture,
      upcoming,
      addToSetlist,
      addScriptureToSetlist,
      updateScripture,
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
      customThemes,
      defaultOverrides,
      addCustomTheme,
      deleteCustomTheme,
      resetDefaultThemes,
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
      updatingSlides,
      activeSong,
      draft,
      slides,
      currentIndex,
      blackout,
      clear,
      presentationOpen,
      presentationFullscreen,
      setlist,
      activeEntryId,
      activeScripture,
      presentingScripture,
      upcoming,
      addToSetlist,
      addScriptureToSetlist,
      updateScripture,
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
      customThemes,
      defaultOverrides,
      addCustomTheme,
      deleteCustomTheme,
      resetDefaultThemes,
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
