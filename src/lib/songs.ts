/**
 * Song library.
 *
 * `SONG_LIBRARY` is the live in-memory list. A fresh install starts empty.
 * `loadLibrary` replaces it from `song-library.json` when that file exists,
 * and writes an empty library when it does not. Every save and delete rewrites
 * the whole file through a one-at-a-time queue so a slow write cannot land last
 * with a stale copy. Search is local over title, artist, and lyric lines.
 */
import type { Song } from "../types";

/** Live list. Callers mutate this array, then persist it. A fresh install starts empty. */
export const SONG_LIBRARY: Song[] = [];

const STORAGE_KEY = "prima-vista-song-library";
const removedSongIds = new Set<string>();

function replaceLibrary(songs: Song[]) {
  SONG_LIBRARY.splice(0, SONG_LIBRARY.length, ...songs);
}

function isSong(value: unknown): value is Song {
  if (!value || typeof value !== "object") return false;
  const song = value as Song;
  return (
    typeof song.id === "string" &&
    typeof song.title === "string" &&
    typeof song.artist === "string" &&
    Array.isArray(song.sections)
  );
}

async function readPersistedLibrary(): Promise<Song[] | null> {
  if (window.primaVista?.loadSongs) {
    const songs = await window.primaVista.loadSongs();
    if (songs && songs.every(isSong)) return songs;
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every(isSong)) return parsed;
  } catch {
    // Ignore corrupt browser storage and fall back to an empty library.
  }
  return null;
}

async function commitPersistedLibrary(songs: Song[]) {
  if (window.primaVista?.saveSongs) {
    const saved = await window.primaVista.saveSongs(songs);
    if (!saved) throw new Error("Couldn't save the song library.");
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

const LIBRARY_SAVE_FAILURE =
  "Couldn't save the song library. Your latest changes are still on screen and may be lost if you quit.";

let librarySaveError: string | null = null;
const librarySaveListeners = new Set<(message: string | null) => void>();

export function subscribeLibrarySaveError(listener: (message: string | null) => void) {
  listener(librarySaveError);
  librarySaveListeners.add(listener);
  return () => {
    librarySaveListeners.delete(listener);
  };
}

function reportLibrarySaveError(message: string | null) {
  librarySaveError = message;
  for (const listener of librarySaveListeners) listener(message);
}

function librarySaveMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const detail = raw.replace(/^Error invoking remote method '[^']+':\s*/, "").trim();
  if (!detail || detail.startsWith("Couldn't save the song library")) return LIBRARY_SAVE_FAILURE;
  return `${LIBRARY_SAVE_FAILURE}\n${detail}`;
}

let libraryWriteTail: Promise<void> = Promise.resolve();

/**
 * Whole-library saves must run one at a time. Each turn copies the in-memory
 * library when the write starts, so a slower save cannot finish last and
 * replace the file with a stale copy. A failed write stays on the queue's
 * rejection, and is also reported for the controller, so the next save can
 * still run.
 */
function persistLibrary(): Promise<void> {
  const write = libraryWriteTail.then(async () => {
    try {
      await commitPersistedLibrary(structuredClone(SONG_LIBRARY));
      reportLibrarySaveError(null);
    } catch (error) {
      reportLibrarySaveError(librarySaveMessage(error));
      throw error;
    }
  });
  libraryWriteTail = write.then(
    () => undefined,
    () => undefined,
  );
  return write;
}

/**
 * Replaces `SONG_LIBRARY` with the saved file, or writes an empty library
 * when no file exists yet. Returns a shallow copy of the live list.
 */
export async function loadLibrary(): Promise<Song[]> {
  const stored = await readPersistedLibrary();
  if (stored) {
    replaceLibrary(stored);
  } else {
    try {
      await persistLibrary();
    } catch {
      // The library stays empty. persistLibrary already reported the failed write.
    }
  }
  return [...SONG_LIBRARY];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Case-insensitive match on title, artist, and lyric lines. An empty query returns every song. */
export function searchSongs(query: string): Song[] {
  const q = normalize(query);
  if (!q) return [...SONG_LIBRARY];
  return SONG_LIBRARY.filter((song) => {
    const haystack = normalize(
      `${song.title} ${song.artist} ${song.sections.map((s) => s.lines.join(" ")).join(" ")}`,
    );
    return haystack.includes(q);
  });
}

export function getSongById(id: string): Song | undefined {
  return SONG_LIBRARY.find((song) => song.id === id);
}

/**
 * Inserts or replaces one song, then writes the whole library.
 * A song already passed to `deleteSong` is not written back by a late save.
 */
export async function saveSong(song: Song): Promise<Song> {
  if (removedSongIds.has(song.id)) return song;
  const index = SONG_LIBRARY.findIndex((existing) => existing.id === song.id);
  if (index === -1) SONG_LIBRARY.push(song);
  else SONG_LIBRARY[index] = song;
  if (removedSongIds.has(song.id)) {
    const lateIndex = SONG_LIBRARY.findIndex((existing) => existing.id === song.id);
    if (lateIndex !== -1) SONG_LIBRARY.splice(lateIndex, 1);
    return song;
  }
  await persistLibrary();
  return song;
}

/** Drops a song from memory and from the file. Returns false if the id was already gone. */
export async function deleteSong(id: string): Promise<boolean> {
  removedSongIds.add(id);
  const index = SONG_LIBRARY.findIndex((existing) => existing.id === id);
  if (index === -1) return false;
  SONG_LIBRARY.splice(index, 1);
  await persistLibrary();
  return true;
}
