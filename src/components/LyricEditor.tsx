import { usePresentation } from "../state/PresentationContext";

export default function LyricEditor() {
  const { editorText, setEditorText, applyEditor } = usePresentation();

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Lyric editor
        </h2>
        <button
          type="button"
          onClick={applyEditor}
          className="rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-1.5 text-xs font-medium text-gold-200 transition hover:bg-gold-500/20"
        >
          Rebuild slides
        </button>
      </div>
      <textarea
        value={editorText}
        onChange={(event) => setEditorText(event.target.value)}
        spellCheck={false}
        className="min-h-[220px] flex-1 resize-none rounded-2xl border border-white/10 bg-sanctuary-950 p-4 font-mono text-[13px] leading-relaxed text-stone-200 outline-none focus:border-gold-500/40 focus:ring-2 focus:ring-gold-400/15"
      />
      <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
        Use <span className="text-stone-300">[Verse 1]</span>,{" "}
        <span className="text-stone-300">[Chorus]</span>, and{" "}
        <span className="text-stone-300">[Bridge]</span> headings. Each pair of
        lines becomes a slide.
      </p>
    </section>
  );
}
