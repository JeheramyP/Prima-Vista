import type { SetlistEntry } from "../types";

const STORAGE_KEY = "prima-vista-setlist";

export const SONG_DRAG_TYPE = "application/x-prima-vista-song";
export const SETLIST_DRAG_TYPE = "application/x-prima-vista-setlist-entry";

function isEntry(value: unknown): value is SetlistEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as SetlistEntry;
  return typeof entry.id === "string" && typeof entry.songId === "string";
}

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

export function createEntry(songId: string): SetlistEntry {
  return { id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, songId };
}
