/**
 * Controller layout.
 *
 * Three columns: setlist, library search, then theme, previews, and either
 * the slide grid or the lyric editor. The whole stage column scrolls as one
 * panel, so the theme row and previews move with whichever pane is below
 * them. Keyboard shortcuts are registered here
 * so they apply across those panes, and they skip events while a field is
 * being typed in. Ctrl/Cmd+Enter still runs Update slides from a field.
 */
import { useEffect, useState, type ReactNode } from "react";
import DualPreview from "../components/DualPreview";
import { subscribeThemeSaveError } from "../lib/customThemes";
import { subscribeLibrarySaveError } from "../lib/songs";
import ThemePicker from "../components/ThemePicker";
import LyricEditor from "../components/LyricEditor";
import SearchBar from "../components/SearchBar";
import ScriptureEditor from "../components/ScriptureEditor";
import SetlistPanel from "../components/SetlistPanel";
import SlideGrid from "../components/SlideGrid";
import SongList from "../components/SongList";
import Toolbar from "../components/Toolbar";
import { usePresentation } from "../state/PresentationContext";

export default function ControllerView() {
  const {
    next,
    prev,
    setBlackout,
    setClear,
    goTo,
    slides,
    applyEditor,
    blackout,
    clear,
    presentingScripture,
    activeScripture,
  } = usePresentation();
  const [tab, setTab] = useState<"overview" | "editor">("overview");
  const [librarySaveError, setLibrarySaveError] = useState<string | null>(null);
  const [themeSaveError, setThemeSaveError] = useState<string | null>(null);
  const saveError = [librarySaveError, themeSaveError].filter(Boolean).join("\n\n");

  useEffect(() => subscribeLibrarySaveError(setLibrarySaveError), []);
  useEffect(() => subscribeThemeSaveError(setThemeSaveError), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
        event.preventDefault();
        void applyEditor();
        return;
      }

      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;
      if (target?.tagName === "BUTTON" && event.key === "Enter") return;

      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Holding these keys must not retrigger. Space and arrows still need
      // preventDefault so the page does not scroll on the repeated events.
      const ignoreRepeat =
        event.code === "Space" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key.toLowerCase() === "b" ||
        event.key.toLowerCase() === "c";
      if (event.repeat && ignoreRepeat) {
        event.preventDefault();
        return;
      }

      if (
        event.code === "Space" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowDown" ||
        event.key === "PageDown"
      ) {
        event.preventDefault();
        next();
      } else if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowUp" ||
        event.key === "PageUp" ||
        event.key === "Backspace"
      ) {
        event.preventDefault();
        prev();
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(slides.length - 1);
      } else if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        setBlackout(!blackout);
        setClear(false);
      } else if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        setClear(!clear);
        setBlackout(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyEditor, blackout, clear, goTo, next, prev, setBlackout, setClear, slides.length]);

  return (
    <div className="flex h-full flex-col bg-sanctuary-950 text-stone-100">
      <Toolbar />
      {saveError ? (
        <div
          role="alert"
          className="whitespace-pre-line border-b border-rose-400/30 bg-rose-500/15 px-5 py-2 text-sm text-rose-50"
        >
          {saveError}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_280px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
          <SetlistPanel />
        </aside>
        <aside className="flex min-h-0 flex-col border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
          <SearchBar />
          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <SongList onNewSong={() => setTab("editor")} />
          </div>
        </aside>
        <main className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
          <ThemePicker />
          <DualPreview />
          {presentingScripture ? (
            <>
              {activeScripture ? <ScriptureEditor /> : null}
              <SlideGrid />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
                  Slides
                </TabButton>
                <TabButton active={tab === "editor"} onClick={() => setTab("editor")}>
                  Editor
                </TabButton>
                <p className="ml-auto hidden text-[12px] text-stone-500 sm:block">
                  Space / arrows change slides · B blackout · C clear
                </p>
              </div>
              {tab === "overview" ? <SlideGrid /> : <LyricEditor />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-white text-sanctuary-950" : "bg-white/5 text-stone-400 hover:text-stone-200"
      }`}
    >
      {children}
    </button>
  );
}
