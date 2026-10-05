/**
 * Theme library persistence.
 *
 * `CUSTOM_THEMES` holds user-made themes and saved edits of built-in ids.
 * Loads and saves go through the preload when Electron is present, and
 * through `localStorage` otherwise. `registerCustomThemes` runs after every
 * change so the stage resolver sees the new paint records immediately.
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
    await window.primaVista.saveThemes(themes);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
}

let themeWriteTail: Promise<void> = Promise.resolve();

/** Same one-at-a-time rule as the song library, so a slow write never lands last with stale data. */
function persistThemes(): Promise<void> {
  const write = themeWriteTail.then(() => commitPersistedThemes(structuredClone(CUSTOM_THEMES)));
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
    if (pending.length) await persistThemes();
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
