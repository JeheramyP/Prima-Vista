/**
 * Setlist persistence.
 *
 * Song entries are `{ id, songId }` in `localStorage`, so the same song can be
 * queued twice and the order is not part of the song file. Scripture entries
 * are `{ id, kind: "scripture", reference, text }` plus an optional theme, and stay on the setlist
 * only. Drag payloads use the MIME types exported here so a library row and a
 * setlist row are not treated as the same drag.
 */
import type { ScriptureSetlistEntry, SetlistEntry } from "../types";

const STORAGE_KEY = "prima-vista-setlist";

export const SONG_DRAG_TYPE = "application/x-prima-vista-song";
export const SETLIST_DRAG_TYPE = "application/x-prima-vista-setlist-entry";

export function isScriptureEntry(entry: SetlistEntry): entry is ScriptureSetlistEntry {
  return "kind" in entry && entry.kind === "scripture";
}

function isEntry(value: unknown): value is SetlistEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as {
    id?: unknown;
    songId?: unknown;
    kind?: unknown;
    reference?: unknown;
    text?: unknown;
    theme?: unknown;
  };
  if (typeof entry.id !== "string") return false;
  if (entry.kind === "scripture") {
    return (
      typeof entry.reference === "string" &&
      typeof entry.text === "string" &&
      (entry.theme === undefined || typeof entry.theme === "string")
    );
  }
  return typeof entry.songId === "string";
}

/** Reads the setlist. A missing or corrupt value starts an empty gathering. */
export function loadSetlist(): SetlistEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every(isEntry)) return parsed;
  } catch {
    // Ignore corrupt storage and start with an empty setlist.
  }
  return [];
}

export function saveSetlist(entries: SetlistEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function createId() {
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEntry(songId: string): SetlistEntry {
  return { id: createId(), songId };
}

export function createScriptureEntry(): ScriptureSetlistEntry {
  return { id: createId(), kind: "scripture", reference: "", text: "" };
}
