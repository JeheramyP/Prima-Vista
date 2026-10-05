/**
 * Preload bridge.
 *
 * Exposes `window.primaVista` in both windows. Each method maps to one IPC
 * channel handled in `main.ts`. The renderer types for this object live on
 * `PrimaVistaAPI` in `src/types.ts`. This file keeps its own loose payload
 * types so the preload build does not import the renderer.
 */
import { contextBridge, ipcRenderer } from "electron";

export type SlidePayload = {
  songTitle: string;
  artist: string;
  sectionLabel: string;
  lines: string[];
  index: number;
  total: number;
  blackout: boolean;
  clear: boolean;
  theme?: string;
  customTheme?: unknown;
  titleSlide?: boolean;
};

export type SongRecord = {
  id: string;
  title: string;
  artist: string;
  key?: string;
  sections: unknown[];
};

contextBridge.exposeInMainWorld("primaVista", {
  openPresentation: () => ipcRenderer.invoke("presentation:open"),
  closePresentation: () => ipcRenderer.invoke("presentation:close"),
  togglePresentationFullscreen: () =>
    ipcRenderer.invoke("presentation:toggle-fullscreen"),
  exitPresentationFullscreen: () =>
    ipcRenderer.invoke("presentation:exit-fullscreen"),
  setSlide: (payload: SlidePayload) => ipcRenderer.send("slide:update", payload),
  getSlide: () => ipcRenderer.invoke("slide:get") as Promise<SlidePayload>,
  onSlideUpdate: (callback: (payload: SlidePayload) => void) => {
    const listener = (_event: unknown, payload: SlidePayload) => callback(payload);
    ipcRenderer.on("slide:update", listener);
    return () => ipcRenderer.removeListener("slide:update", listener);
  },
  onPresentationClosed: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("presentation:closed", listener);
    return () => ipcRenderer.removeListener("presentation:closed", listener);
  },
  onPresentationFullscreen: (callback: (fullscreen: boolean) => void) => {
    const listener = (_event: unknown, fullscreen: boolean) => callback(fullscreen);
    ipcRenderer.on("presentation:fullscreen", listener);
    return () => ipcRenderer.removeListener("presentation:fullscreen", listener);
  },
  loadSongs: () => ipcRenderer.invoke("songs:load") as Promise<SongRecord[] | null>,
  saveSongs: (songs: SongRecord[]) =>
    ipcRenderer.invoke("songs:save", songs) as Promise<boolean>,
  loadThemes: () => ipcRenderer.invoke("themes:load") as Promise<unknown[] | null>,
  saveThemes: (themes: unknown[]) =>
    ipcRenderer.invoke("themes:save", themes) as Promise<boolean>,
  restoreWindowFocus: () => ipcRenderer.send("window:focus-fix"),
});
