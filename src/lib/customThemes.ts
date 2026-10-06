/**
 * Theme library persistence.
 *
 * `CUSTOM_THEMES` holds user-made themes and saved edits of built-in ids.
 * Loads and saves go through the preload when Electron is present, and
 * through `localStorage` otherwise. `registerCustomThemes` runs after every
 * change so the stage resolver sees the new paint records immediately.
 * A failed write is reported on the controller banner and left in memory.
 */
import {
  isCustomThemeRecord,
  isDefaultThemeId,
  registerCustomThemes,
  type CustomThemeRecord,
} from "./stageThemes";

const STORAGE_KEY = "prima-vista-custom-themes";

export const CUSTOM_THEMES: CustomThemeRecord[] = [];

function sync() {
  registerCustomThemes(CUSTOM_THEMES);
}

async function readPersistedThemes(): Promise<CustomThemeRecord[] | null> {
  if (window.primaVista?.loadThemes) {
    const themes = await window.primaVista.loadThemes();
    return themes ? themes.filter(isCustomThemeRecord) : null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter(isCustomThemeRecord);
  } catch {
    // Ignore corrupt browser storage and start with no custom themes.
  }
  return null;
}

async function commitPersistedThemes(themes: CustomThemeRecord[]) {
  if (window.primaVista?.saveThemes) {
    const saved = await window.primaVista.saveThemes(themes);
    if (!saved) throw new Error("Couldn't save themes.");
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

const THEME_SAVE_FAILURE =
  "Couldn't save themes. Your latest changes are still on screen and may be lost if you quit.";

let themeSaveError: string | null = null;
const themeSaveListeners = new Set<(message: string | null) => void>();

export function subscribeThemeSaveError(listener: (message: string | null) => void) {
  listener(themeSaveError);
  themeSaveListeners.add(listener);
  return () => {
    themeSaveListeners.delete(listener);
  };
}

function reportThemeSaveError(message: string | null) {
  themeSaveError = message;
  for (const listener of themeSaveListeners) listener(message);
}

function themeSaveMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const detail = raw.replace(/^Error invoking remote method '[^']+':\s*/, "").trim();
  if (!detail || detail.startsWith("Couldn't save themes")) return THEME_SAVE_FAILURE;
  return `${THEME_SAVE_FAILURE}\n${detail}`;
}

let themeWriteTail: Promise<void> = Promise.resolve();

/**
 * Same one-at-a-time rule as the song library, so a slow write never lands last
 * with stale data. A failed write stays on the queue's rejection, and is also
 * reported for the controller, so the next save can still run.
 */
function persistThemes(): Promise<void> {
  const write = themeWriteTail.then(async () => {
    try {
      await commitPersistedThemes(structuredClone(CUSTOM_THEMES));
      reportThemeSaveError(null);
    } catch (error) {
      reportThemeSaveError(themeSaveMessage(error));
      throw error;
    }
  });
  themeWriteTail = write.then(
    () => undefined,
    () => undefined,
  );
  return write;
}

export async function loadCustomThemes(): Promise<CustomThemeRecord[]> {
  const stored = await readPersistedThemes();
  if (stored) {
    // Themes created while the file was still loading are kept alongside the saved ones.
    const pending = CUSTOM_THEMES.filter((theme) => !stored.some((saved) => saved.id === theme.id));
    CUSTOM_THEMES.splice(0, CUSTOM_THEMES.length, ...stored, ...pending);
    if (pending.length) {
      try {
        await persistThemes();
      } catch {
        // Pending themes stay in memory. persistThemes already reported the failed write.
      }
    }
  }
  sync();
  return [...CUSTOM_THEMES];
}

export function createCustomThemeId() {
  return `theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveCustomTheme(record: CustomThemeRecord): Promise<CustomThemeRecord[]> {
  const index = CUSTOM_THEMES.findIndex((theme) => theme.id === record.id);
  if (index === -1) CUSTOM_THEMES.push(record);
  else CUSTOM_THEMES[index] = record;
  sync();
  await persistThemes();
  return [...CUSTOM_THEMES];
}

export async function deleteCustomTheme(id: string): Promise<CustomThemeRecord[]> {
  if (isDefaultThemeId(id)) return [...CUSTOM_THEMES];
  const index = CUSTOM_THEMES.findIndex((theme) => theme.id === id);
  if (index === -1) return [...CUSTOM_THEMES];
  CUSTOM_THEMES.splice(index, 1);
  sync();
  await persistThemes();
  return [...CUSTOM_THEMES];
}

/** Removes saved edits of the built-in themes. User-made themes stay in the library. */
export async function resetDefaultThemes(): Promise<CustomThemeRecord[]> {
  const custom = CUSTOM_THEMES.filter((theme) => !isDefaultThemeId(theme.id));
  if (custom.length === CUSTOM_THEMES.length) return [...CUSTOM_THEMES];
  CUSTOM_THEMES.splice(0, CUSTOM_THEMES.length, ...custom);
  sync();
  await persistThemes();
  return [...CUSTOM_THEMES];
}

export function customThemeRecord(id: string | undefined) {
  return id ? CUSTOM_THEMES.find((theme) => theme.id === id) : undefined;
}
