/**
 * Controller header.
 *
 * Shows the live song and slide index, and the transport controls: previous,
 * next, clear, blackout, and open or close the output window.
 */
import type { ReactNode } from "react";
import { usePresentation } from "../state/PresentationContext";

function ControlButton({
  children,
  onClick,
  active,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? danger
            ? "border-rose-400/50 bg-rose-500/20 text-rose-100"
            : "border-gold-400/50 bg-gold-500/20 text-gold-100"
          : "border-white/10 bg-white/[0.04] text-stone-200 hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  );
}

export default function Toolbar() {
  const {
    activeSong,
    currentIndex,
    slides,
    blackout,
    clear,
    presentationOpen,
    presentationFullscreen,
    prev,
    next,
    setBlackout,
    setClear,
    openPresentation,
    closePresentation,
    toggleFullscreen,
  } = usePresentation();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-sanctuary-900/90 px-5 py-3 backdrop-blur">
      <div>
        <p className="text-[12px] uppercase tracking-[0.28em] text-gold-400">Prima Vista</p>
        <h1 className="font-display text-xl text-stone-50">
          {activeSong?.title ?? "No song selected"}
        </h1>
        <p className="text-xs text-stone-500">
          {activeSong?.artist}
          {slides.length
            ? ` · Slide ${Math.min(currentIndex + 1, slides.length)} of ${slides.length}`
            : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ControlButton onClick={prev}>Previous</ControlButton>
        <ControlButton onClick={next}>Next</ControlButton>
        <ControlButton
          active={clear}
          onClick={() => {
            setClear(!clear);
            if (!clear) setBlackout(false);
          }}
        >
          Clear
        </ControlButton>
        <ControlButton
          danger
          active={blackout}
          onClick={() => {
            setBlackout(!blackout);
            if (!blackout) setClear(false);
          }}
        >
          Blackout
        </ControlButton>
        {presentationOpen ? (
          <>
            <ControlButton onClick={() => void toggleFullscreen()}>
              {presentationFullscreen ? "Exit fullscreen" : "Fullscreen output"}
            </ControlButton>
            <ControlButton danger active onClick={() => void closePresentation()}>
              Close output
            </ControlButton>
          </>
        ) : (
          <ControlButton active onClick={() => void openPresentation()}>
            Open output
          </ControlButton>
        )}
      </div>
    </header>
  );
}
