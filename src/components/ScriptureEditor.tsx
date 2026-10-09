/**
 * Passage editor for the live scripture slide.
 *
 * Reference and verse text write straight onto the setlist entry, so the
 * preview and the output update as the operator types. Four non-empty lines
 * become one slide. The reference is painted on every slide of the passage.
 */
import { useEffect, useRef } from "react";
import { usePresentation } from "../state/PresentationContext";

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-sanctuary-950 px-3 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-600 focus:border-gold-500/40 focus:ring-2 focus:ring-gold-400/15";

export default function ScriptureEditor() {
  const { activeScripture, updateScripture } = usePresentation();
  const referenceRef = useRef<HTMLInputElement>(null);
  const entryId = activeScripture?.id;

  useEffect(() => {
    const input = referenceRef.current;
    if (input && !input.value) input.focus();
  }, [entryId]);

  if (!activeScripture) return null;

  return (
    <section className="space-y-3">
      <div>
        <label
          htmlFor="scripture-reference"
          className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500"
        >
          Reference
        </label>
        <input
          id="scripture-reference"
          ref={referenceRef}
          value={activeScripture.reference}
          onChange={(event) => updateScripture(activeScripture.id, { reference: event.target.value })}
          placeholder="John 3:16"
          spellCheck={false}
          className={fieldClass}
        />
      </div>
      <div>
        <label
          htmlFor="scripture-text"
          className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500"
        >
          Passage
        </label>
        <textarea
          id="scripture-text"
          value={activeScripture.text}
          onChange={(event) => updateScripture(activeScripture.id, { text: event.target.value })}
          placeholder={"For God so loved the world,\nthat he gave his one and only Son"}
          rows={6}
          spellCheck
          className={`${fieldClass} resize-y leading-relaxed`}
        />
      </div>
      <p className="text-[12px] text-stone-500">
        The whole passage stays on one slide. A short reading runs across the slide, and a longer reading puts more words on each line.
      </p>
    </section>
  );
}
