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
});
