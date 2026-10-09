/**
 * Theme row for the selected song.
 *
 * Lists built-in looks, saved edits of those looks, and user-made themes.
 * Choosing one saves it on the song immediately. Edit opens `CustomThemeEditor`.
 * Reset defaults drops built-in overrides and leaves user themes in place.
 */
import { useCallback, useRef, useState } from "react";
import { confirmDialog } from "../lib/confirm";
import {
  buildCustomTheme,
  editableDefaultTheme,
  isDefaultThemeId,
  songThemeId,
  STAGE_THEMES,
  stageThemeById,
  type CustomThemeRecord,
  type StageTheme,
} from "../lib/stageThemes";
import { usePresentation } from "../state/PresentationContext";
import CustomThemeEditor from "./CustomThemeEditor";

export default function ThemePicker() {
  const {
    activeSong,
    activeScripture,
    setSongTheme,
    customThemes,
    defaultOverrides,
    addCustomTheme,
    deleteCustomTheme,
    resetDefaultThemes,
  } = usePresentation();
  const theme = stageThemeById(songThemeId(activeScripture ?? activeSong));
  const canChooseTheme = Boolean(activeSong || activeScripture);
  const [editor, setEditor] = useState<{ kind: "create" } | { kind: "edit"; record: CustomThemeRecord } | null>(
    null,
  );
  const toggleRef = useRef<HTMLButtonElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const closeEditor = useCallback(() => setEditor(null), []);

  const saveTheme = (record: CustomThemeRecord) => {
    addCustomTheme(record);
    setEditor(null);
  };

  const removeTheme = (record: CustomThemeRecord) => {
    if (
      confirmDialog(
        `Delete the "${record.name}" theme? Songs using it will switch back to Sanctuary.`,
      )
    ) {
      deleteCustomTheme(record.id);
      setEditor((current) => (current?.kind === "edit" && current.record.id === record.id ? null : current));
    }
  };

  const editDefault = (item: StageTheme) => {
    const record = defaultOverrides.find((theme) => theme.id === item.id) ?? editableDefaultTheme(item);
    setEditor({ kind: "edit", record });
  };

  const resetBuiltIns = () => {
    if (defaultOverrides.length === 0) return;
    if (
      !confirmDialog(
        "Reset the built-in themes to their original look? Custom themes will stay as they are.",
      )
    ) {
      return;
    }
    resetDefaultThemes();
    setEditor((current) =>
      current?.kind === "edit" && isDefaultThemeId(current.record.id) ? null : current,
    );
  };

  const chip = (item: StageTheme) => {
    const selected = item.id === theme.id;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        title={item.blurb}
        disabled={!canChooseTheme}
        onClick={() => setSongTheme(item.id)}
        className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
          selected
            ? "border-gold-400/60 bg-gold-500/15 text-stone-50"
            : "border-white/10 bg-white/[0.03] text-stone-400 hover:border-white/20 hover:text-stone-200"
        }`}
      >
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/30"
          style={{ background: item.chip }}
        />
        {item.name}
      </button>
    );
  };

  const canReset = defaultOverrides.length > 0;

  return (
    <div ref={anchorRef} className="relative">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          {activeScripture ? "Slide theme" : "Song theme"}
        </span>
        <button
          type="button"
          onClick={resetBuiltIns}
          disabled={!canReset}
          title={
            canReset
              ? "Restore the original built-in themes. Custom themes are not changed."
              : "Built-in themes are already original"
          }
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition disabled:cursor-default ${
            canReset
              ? "border-gold-400/50 bg-gold-500/15 text-gold-50 shadow-[0_0_18px_rgba(212,168,74,0.18)] hover:border-gold-300/70 hover:bg-gold-500/25"
              : "border-white/20 bg-white/[0.04] text-stone-300"
          }`}
        >
          Reset built-in themes
        </button>
      </div>
      <div
        role="radiogroup"
        aria-label={activeScripture ? "Theme for the scripture slide" : "Theme for the selected song"}
        className="flex max-h-[min(16rem,40vh)] flex-wrap items-center gap-1.5 overflow-y-auto overscroll-contain px-1 pb-1 pt-2"
      >
        {STAGE_THEMES.map((item) => {
          const resolved = stageThemeById(item.id);
          const editing = editor?.kind === "edit" && editor.record.id === item.id;
          const overridden = defaultOverrides.some((theme) => theme.id === item.id);
          return (
            <span key={item.id} className="group relative">
              {chip(overridden ? { ...resolved, blurb: `${item.blurb} · edited` } : resolved)}
              <span
                className={`absolute -right-1 -top-2 flex transition focus-within:opacity-100 group-hover:opacity-100 ${
                  editing ? "opacity-100" : "opacity-0"
                }`}
              >
                <button
                  type="button"
                  data-theme-editor-toggle
                  aria-label={`Edit ${resolved.name} theme`}
                  aria-expanded={editing}
                  title="Edit theme"
                  onClick={() => editDefault(item)}
                  className={`flex h-4 w-4 items-center justify-center rounded-full border bg-sanctuary-800 transition ${
                    editing
                      ? "border-gold-400/60 text-gold-200"
                      : "border-white/15 text-stone-400 hover:border-gold-400/50 hover:text-gold-200"
                  }`}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5" aria-hidden="true">
                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
                  </svg>
                </button>
              </span>
            </span>
          );
        })}
        {customThemes.map((record) => {
          const editing = editor?.kind === "edit" && editor.record.id === record.id;
          return (
            <span key={record.id} className="group relative">
              {chip(buildCustomTheme(record))}
              <span
                className={`absolute -right-1 -top-2 flex gap-0.5 transition focus-within:opacity-100 group-hover:opacity-100 ${
                  editing ? "opacity-100" : "opacity-0"
                }`}
              >
                <button
                  type="button"
                  data-theme-editor-toggle
                  aria-label={`Edit ${record.name} theme`}
                  aria-expanded={editing}
                  title="Edit theme"
                  onClick={() => setEditor({ kind: "edit", record })}
                  className={`flex h-4 w-4 items-center justify-center rounded-full border bg-sanctuary-800 transition ${
                    editing
                      ? "border-gold-400/60 text-gold-200"
                      : "border-white/15 text-stone-400 hover:border-gold-400/50 hover:text-gold-200"
                  }`}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5" aria-hidden="true">
                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${record.name} theme`}
                  title="Delete theme"
                  onClick={() => removeTheme(record)}
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-sanctuary-800 text-stone-400 transition hover:border-red-400/50 hover:bg-red-500/20 hover:text-red-200"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </span>
            </span>
          );
        })}
        <button
          ref={toggleRef}
          type="button"
          aria-label="Create custom theme"
          aria-expanded={editor?.kind === "create"}
          title="Create custom theme"
          onClick={() => setEditor((current) => (current?.kind === "create" ? null : { kind: "create" }))}
          className={`flex h-[26px] w-[26px] items-center justify-center rounded-full border text-stone-400 transition hover:border-gold-400/50 hover:text-gold-200 ${
            editor?.kind === "create"
              ? "border-gold-400/60 bg-gold-500/15 text-gold-200"
              : "border-dashed border-white/20"
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
        </button>
      </div>
      {editor && (
        <CustomThemeEditor
          key={editor.kind === "edit" ? editor.record.id : "new"}
          suggestedName={editor.kind === "edit" ? editor.record.name : `Custom ${customThemes.length + 1}`}
          initial={editor.kind === "edit" ? editor.record : undefined}
          anchorRef={anchorRef}
          ignoreRef={toggleRef}
          onSave={saveTheme}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}
