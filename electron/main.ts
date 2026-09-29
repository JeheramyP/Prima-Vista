import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = isDev
  ? path.join(process.env.DIST, "../public")
  : process.env.DIST;

const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

let controllerWindow: BrowserWindow | null = null;
let presentationWindow: BrowserWindow | null = null;

type SlidePayload = {
  songTitle: string;
  artist: string;
  sectionLabel: string;
  lines: string[];
  index: number;
  total: number;
  blackout: boolean;
  clear: boolean;
};

let lastSlide: SlidePayload = {
  songTitle: "",
  artist: "",
  sectionLabel: "",
  lines: [],
  index: 0,
  total: 0,
  blackout: true,
  clear: false,
};

function rendererUrl(hash = "") {
  if (VITE_DEV_SERVER_URL) {
    return `${VITE_DEV_SERVER_URL}${hash}`;
  }
  return path.join(process.env.DIST as string, "index.html");
}

function createControllerWindow() {
  controllerWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#0c0b0a",
    title: "Prima Vista",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    controllerWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    controllerWindow.loadFile(rendererUrl(), { hash: "/" });
  }

  controllerWindow.on("closed", () => {
    controllerWindow = null;
    if (presentationWindow && !presentationWindow.isDestroyed()) {
      presentationWindow.close();
    }
  });
}

function createPresentationWindow() {
  if (presentationWindow && !presentationWindow.isDestroyed()) {
    presentationWindow.focus();
    presentationWindow.webContents.send("slide:update", lastSlide);
    return;
  }

  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find((d) => d.id !== primary.id) ?? primary;
  const { x, y, width, height } = external.bounds;

  const placeOnExternal = displays.length > 1;

  presentationWindow = new BrowserWindow({
    x: placeOnExternal ? x : primary.bounds.x + 80,
    y: placeOnExternal ? y : primary.bounds.y + 80,
    width: placeOnExternal ? width : 1280,
    height: placeOnExternal ? height : 720,
    fullscreen: placeOnExternal,
    frame: false,
    transparent: false,
    backgroundColor: "#000000",
    title: "Prima Vista Output",
    autoHideMenuBar: true,
    skipTaskbar: false,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    presentationWindow.loadURL(`${VITE_DEV_SERVER_URL}#/presentation`);
  } else {
    presentationWindow.loadFile(rendererUrl(), { hash: "/presentation" });
  }

  presentationWindow.on("closed", () => {
    presentationWindow = null;
    controllerWindow?.webContents.send("presentation:closed");
  });

  presentationWindow.webContents.once("did-finish-load", () => {
    presentationWindow?.webContents.send("slide:update", lastSlide);
  });
}

app.whenReady().then(() => {
  createControllerWindow();

  ipcMain.handle("presentation:open", () => {
    createPresentationWindow();
    return true;
  });

  ipcMain.handle("presentation:close", () => {
    if (presentationWindow && !presentationWindow.isDestroyed()) {
      presentationWindow.close();
    }
    return true;
  });

  ipcMain.handle("presentation:toggle-fullscreen", () => {
    if (!presentationWindow || presentationWindow.isDestroyed()) return false;
    presentationWindow.setFullScreen(!presentationWindow.isFullScreen());
    return presentationWindow.isFullScreen();
  });

  ipcMain.handle("slide:get", () => lastSlide);

  ipcMain.on("slide:update", (_event, payload: SlidePayload) => {
    lastSlide = payload;
    if (presentationWindow && !presentationWindow.isDestroyed()) {
      presentationWindow.webContents.send("slide:update", payload);
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControllerWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
