/**
 * Electron main process.
 *
 * Owns the controller window and the frameless output window, the last slide
 * payload, and the two JSON files in `userData` (`song-library.json`,
 * `custom-themes.json`). The renderer reaches this file only through the
 * channels in `preload.ts`. Closing the controller closes the output.
 */
import { app, BrowserWindow, ipcMain, nativeImage, screen } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { writeJsonAtomic } from "./writeJsonAtomic";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = isDev
  ? path.join(process.env.DIST, "../public")
  : process.env.DIST;

const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const preloadPath = path.join(__dirname, "preload.js");
/** Taskbar and window icon. Vite copies `public/assets` into `dist/assets`. */
const appIcon = nativeImage.createFromPath(
  path.join(process.env.VITE_PUBLIC as string, "assets", "Prima Vista.png"),
);

/** Controller on `#/`. Closing it also closes the output. */
let controllerWindow: BrowserWindow | null = null;
/** Frameless stage on `#/presentation`. Null while the output is closed. */
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
  theme?: string;
  customTheme?: unknown;
  titleSlide?: boolean;
  ccli?: string;
  copyright?: string;
};

type SongRecord = {
  id: string;
  title: string;
  artist: string;
  key?: string;
  sections: unknown[];
};

/** Latest payload, replayed when the output window is created or reopened. */
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

function libraryPath() {
  return path.join(app.getPath("userData"), "song-library.json");
}

async function readLibraryFile(): Promise<SongRecord[] | null> {
  try {
    const raw = await fs.readFile(libraryPath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (song): song is SongRecord =>
        !!song &&
        typeof song === "object" &&
        typeof (song as SongRecord).id === "string" &&
        typeof (song as SongRecord).title === "string" &&
        typeof (song as SongRecord).artist === "string" &&
        Array.isArray((song as SongRecord).sections),
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    console.error("Failed to read song library:", error);
    return null;
  }
}

async function writeLibraryFile(songs: SongRecord[]) {
  await writeJsonAtomic(libraryPath(), songs);
}

function themesPath() {
  return path.join(app.getPath("userData"), "custom-themes.json");
}

/** Records are validated in the renderer, which owns the theme format. */
async function readThemesFile(): Promise<unknown[] | null> {
  try {
    const raw = await fs.readFile(themesPath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    console.error("Failed to read custom themes:", error);
    return null;
  }
}

async function writeThemesFile(themes: unknown[]) {
  await writeJsonAtomic(themesPath(), themes);
}

function rendererUrl(hash = "") {
  if (VITE_DEV_SERVER_URL) {
    return `${VITE_DEV_SERVER_URL}${hash}`;
  }
  return path.join(process.env.DIST as string, "index.html");
}

/** Leave fullscreen or maximized. A frameless window does not get the usual title-bar gesture. */
function restorePresentationWindow() {
  const win = presentationWindow;
  if (!win || win.isDestroyed()) return false;
  if (win.isFullScreen()) win.setFullScreen(false);
  if (win.isMaximized()) win.unmaximize();
  return win.isFullScreen();
}

/** Operator window. Does not go fullscreen with the projector. */
function createControllerWindow() {
  controllerWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#0c0b0a",
    title: "Prima Vista",
    icon: appIcon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
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

/**
 * Output window. A second display gets a fullscreen window on that display.
 * A single display gets a smaller window offset from the primary so it can
 * be dragged onto a projector. Calling this again focuses the existing window
 * and resends the current slide.
 */
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
    icon: appIcon,
    autoHideMenuBar: true,
    skipTaskbar: false,
    alwaysOnTop: false,
    webPreferences: {
      preload: preloadPath,
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

  const sendFullscreen = (fullscreen: boolean) => {
    controllerWindow?.webContents.send("presentation:fullscreen", fullscreen);
  };

  presentationWindow.on("enter-full-screen", () => sendFullscreen(true));
  presentationWindow.on("leave-full-screen", () => sendFullscreen(false));

  presentationWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown" || input.key !== "Escape" || input.isAutoRepeat) return;
    const win = presentationWindow;
    if (!win || win.isDestroyed() || (!win.isFullScreen() && !win.isMaximized())) return;
    event.preventDefault();
    restorePresentationWindow();
  });

  presentationWindow.on("closed", () => {
    presentationWindow = null;
    controllerWindow?.webContents.send("presentation:closed");
    sendFullscreen(false);
  });

  presentationWindow.webContents.once("did-finish-load", () => {
    presentationWindow?.webContents.send("slide:update", lastSlide);
  });
}

app.whenReady().then(() => {
  createControllerWindow();

  ipcMain.handle("presentation:open", () => {
    createPresentationWindow();
    const fullscreen =
      !!presentationWindow &&
      !presentationWindow.isDestroyed() &&
      presentationWindow.isFullScreen();
    controllerWindow?.webContents.send("presentation:fullscreen", fullscreen);
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

  ipcMain.handle("presentation:exit-fullscreen", () => restorePresentationWindow());

  ipcMain.handle("slide:get", () => lastSlide);

  ipcMain.on("slide:update", (_event, payload: SlidePayload) => {
    lastSlide = payload;
    if (presentationWindow && !presentationWindow.isDestroyed()) {
      presentationWindow.webContents.send("slide:update", payload);
    }
  });

  ipcMain.handle("songs:load", async () => {
    return readLibraryFile();
  });

  ipcMain.handle("songs:save", async (_event, songs: SongRecord[]) => {
    if (!Array.isArray(songs)) return false;
    try {
      await writeLibraryFile(songs);
    } catch (error) {
      console.error("Failed to save song library:", error);
      throw error;
    }
    return true;
  });

  ipcMain.handle("themes:load", async () => {
    return readThemesFile();
  });

  ipcMain.handle("themes:save", async (_event, themes: unknown[]) => {
    if (!Array.isArray(themes)) return false;
    try {
      await writeThemesFile(themes);
    } catch (error) {
      console.error("Failed to save themes:", error);
      throw error;
    }
    return true;
  });

  // window.confirm/alert leave the renderer unable to receive keystrokes on
  // Linux and Windows until the window is blurred and focused again.
  // https://github.com/electron/electron/issues/31917
  ipcMain.on("window:focus-fix", (event) => {
    if (process.platform === "darwin") return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    win.blur();
    win.focus();
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
