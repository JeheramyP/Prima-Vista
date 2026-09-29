import { useEffect, useState, type ReactNode } from "react";
import DualPreview from "../components/DualPreview";
import LyricEditor from "../components/LyricEditor";
import SearchBar from "../components/SearchBar";
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
  } = usePresentation();
  const [tab, setTab] = useState<"overview" | "editor">("overview");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;
      if (target?.tagName === "BUTTON" && (event.code === "Space" || event.key === "Enter")) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "enter") {
        event.preventDefault();
        void applyEditor();
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.code === "Space" || event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp" || event.key === "Backspace") {
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
        <main className="flex min-h-0 flex-col gap-4 overflow-hidden p-4">
          <DualPreview />
          <div className="flex items-center gap-2">
            <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
              Slides
            </TabButton>
            <TabButton active={tab === "editor"} onClick={() => setTab("editor")}>
              Editor
            </TabButton>
            <p className="ml-auto hidden text-[11px] text-stone-500 sm:block">
              Space / arrows change slides · B blackout · C clear
            </p>
          </div>
          <div className="min-h-0 flex-1">
            {tab === "overview" ? <SlideGrid /> : <LyricEditor />}
          </div>
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
