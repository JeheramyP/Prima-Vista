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
  loadSongs: () => ipcRenderer.invoke("songs:load") as Promise<SongRecord[] | null>,
  saveSongs: (songs: SongRecord[]) =>
    ipcRenderer.invoke("songs:save", songs) as Promise<boolean>,
  restoreWindowFocus: () => ipcRenderer.send("window:focus-fix"),
});
