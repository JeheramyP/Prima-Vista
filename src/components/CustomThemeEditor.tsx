/**
 * Custom theme panel.
 *
 * Edits a fill, one to three hex colors, and a linear angle, with named
 * presets as starting points. The preview is a real `StageTheme` from
 * `themeFromRecord`, so type and contrast match the output. Saving reports
 * a `CustomThemeRecord`. It does not write the file itself.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createCustomThemeId } from "../lib/customThemes";
import {
  CUSTOM_FILLS,
  customChip,
  isDefaultThemeId,
  stageLyricStyle,
  stageSurfaceStyle,
  themeFromRecord,
  type CustomFill,
  type CustomThemeRecord,
} from "../lib/stageThemes";

type Preset = { name: string; fill: CustomFill; colors: string[]; angle: number };

const PRESETS: Preset[] = [
  { name: "Sunrise", fill: "linear", colors: ["#ff9a5a", "#e2557a", "#4a2378"], angle: 160 },
  { name: "Ocean", fill: "linear", colors: ["#0b2740", "#0e6488", "#3fb0c6"], angle: 180 },
  { name: "Aurora", fill: "linear", colors: ["#081a26", "#13695e", "#5cc79a"], angle: 135 },
  { name: "Dusk", fill: "linear", colors: ["#170d30", "#462766", "#b5627e"], angle: 180 },
  { name: "Lavender", fill: "radial", colors: ["#e9defa", "#b9a3e3", "#6f5aa8"], angle: 0 },
  { name: "Spotlight", fill: "radial", colors: ["#3a3a46", "#14141a", "#000000"], angle: 0 },
  { name: "Night Glow", fill: "glow", colors: ["#06070f", "#6a5cff"], angle: 0 },
  { name: "Firelight", fill: "glow", colors: ["#120604", "#ff6a1f"], angle: 0 },
  { name: "Slate", fill: "solid", colors: ["#1f2933"], angle: 0 },
];

const FALLBACK_PALETTE = ["#1b2440", "#5a3f8c", "#d08a5c"];
const HEX_INPUT = /^#?[0-9a-f]{6}$/i;

function stopLabel(fill: CustomFill, index: number) {
  if (fill === "solid") return "Color";
  if (fill === "glow") return index === 0 ? "Base" : "Glow";
  return `Stop ${index + 1}`;
}

export default function CustomThemeEditor({
  suggestedName,
  initial,
  ignoreRef,
  onSave,
  onClose,
}: {
  suggestedName: string;
  /** When set, the panel edits this theme instead of creating one. */
  initial?: CustomThemeRecord;
  /** The button that toggles this panel, so clicking it is not an outside click. */
  ignoreRef?: RefObject<HTMLElement>;
  onSave: (theme: CustomThemeRecord) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [fill, setFill] = useState<CustomFill>(initial?.fill ?? "linear");
  const [palette, setPalette] = useState<string[]>(() =>
    initial ? withFallbackStops(initial.colors) : FALLBACK_PALETTE,
  );
  const [count, setCount] = useState(() => {
    if (!initial) return 2;
    const [min, max] = CUSTOM_FILLS.find((option) => option.id === initial.fill)!.stops;
    return Math.max(min, Math.min(max, initial.colors.length));
  });
  const [angle, setAngle] = useState(initial?.angle ?? 180);
  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [minStops, maxStops] = CUSTOM_FILLS.find((option) => option.id === fill)!.stops;
  const colors = palette.slice(0, count);

  const editingBuiltIn = Boolean(initial && isDefaultThemeId(initial.id));
  const preview = useMemo(
    () =>
      themeFromRecord({
        id: initial?.id ?? "preview",
        name: name || suggestedName,
        fill,
        colors,
        angle,
      }),
    [angle, colors.join(), fill, initial?.id, name, suggestedName],
  );

  useEffect(() => {
    nameRef.current?.focus();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || ignoreRef?.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-theme-editor-toggle]")) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ignoreRef, onClose]);

  const chooseFill = (next: CustomFill) => {
    const [min, max] = CUSTOM_FILLS.find((option) => option.id === next)!.stops;
    setFill(next);
    setCount((current) => Math.max(min, Math.min(max, current)));
  };

  const setColor = (index: number, color: string) => {
    setPalette((current) => current.map((existing, i) => (i === index ? color : existing)));
  };

  const applyPreset = (preset: Preset) => {
    setFill(preset.fill);
    setPalette([...preset.colors, ...FALLBACK_PALETTE.slice(preset.colors.length)]);
    setCount(preset.colors.length);
    if (preset.fill === "linear") setAngle(preset.angle);
    setName((current) =>
      !current.trim() || PRESETS.some((p) => p.name === current) ? preset.name : current,
    );
  };

  const save = () => {
    onSave({
      id: initial?.id ?? createCustomThemeId(),
      name: name.trim() || suggestedName,
      fill,
      colors,
      angle,
    });
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={editingBuiltIn ? "Edit built-in theme" : initial ? "Edit custom theme" : "New custom theme"}
      className="absolute left-0 top-full z-30 mt-2 max-h-[calc(100vh-11rem)] w-[380px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-white/10 bg-sanctuary-950/95 p-4 shadow-stage backdrop-blur"
    >
      <div
        className="relative mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl border px-6 text-center"
        style={{
          ...stageSurfaceStyle(preview),
          borderColor: preview.light ? "rgba(42, 32, 22, 0.16)" : "rgba(255, 255, 255, 0.1)",
        }}
      >
        <p className="text-xl" style={stageLyricStyle(preview)}>
          <span className="block">Amazing grace, how sweet the sound</span>
          <span className="block">That saved a wretch like me</span>
        </p>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Name
        </span>
        <input
          ref={nameRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
          }}
          placeholder={suggestedName}
          maxLength={32}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-stone-100 outline-none placeholder:text-stone-600 focus:border-gold-400/50"
        />
      </label>

      <div className="mb-3">
        <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Presets
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              title={preset.name}
              aria-label={`Start from ${preset.name}`}
              onClick={() => applyPreset(preset)}
              className="h-7 w-7 rounded-full border border-white/15 transition hover:scale-110 hover:border-white/40"
              style={{ background: customChip(preset) }}
            />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Style
        </span>
        <div role="radiogroup" aria-label="Background style" className="grid grid-cols-4 gap-1 rounded-lg bg-white/[0.04] p-1">
          {CUSTOM_FILLS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={fill === option.id}
              onClick={() => chooseFill(option.id)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                fill === option.id ? "bg-white text-sanctuary-950" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 space-y-1.5">
        {colors.map((color, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(index, event.target.value)}
              aria-label={stopLabel(fill, index)}
              className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent p-0.5"
            />
            <span className="w-14 text-xs text-stone-400">{stopLabel(fill, index)}</span>
            <HexInput value={color} onChange={(next) => setColor(index, next)} />
            {count > minStops && index === count - 1 && (
              <button
                type="button"
                aria-label="Remove color stop"
                title="Remove color stop"
                onClick={() => setCount(count - 1)}
                className="rounded-lg p-1 text-stone-500 transition hover:bg-red-500/15 hover:text-red-300"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {count < maxStops && (
          <button
            type="button"
            onClick={() => setCount(count + 1)}
            className="text-xs font-medium text-gold-200 hover:text-gold-50"
          >
            + Add color stop
          </button>
        )}
      </div>

      {fill === "linear" && (
        <label className="mb-4 block">
          <span className="mb-1 flex justify-between text-[12px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Direction
            <span className="tracking-normal text-stone-400">{angle}°</span>
          </span>
          <input
            type="range"
            min={0}
            max={345}
            step={15}
            value={angle}
            onChange={(event) => setAngle(Number(event.target.value))}
            className="w-full accent-gold-400"
          />
        </label>
      )}

      {editingBuiltIn && (
        <p className="mb-3 text-xs leading-relaxed text-stone-500">
          Saving replaces this built-in look. Reset built-in themes restores the originals and leaves custom themes alone.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          className="rounded-lg border border-gold-500/30 bg-gold-500/15 px-3 py-1.5 text-xs font-medium text-gold-50 transition hover:bg-gold-500/25"
        >
          {initial ? "Save changes" : "Save theme"}
        </button>
      </div>
    </div>
  );
}

function withFallbackStops(colors: string[]) {
  const normalized = colors.map((color) => color.toLowerCase());
  return [...normalized, ...FALLBACK_PALETTE].slice(0, Math.max(normalized.length, FALLBACK_PALETTE.length));
}

function HexInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  return (
    <input
      value={text}
      onChange={(event) => {
        const next = event.target.value.trim();
        setText(next);
        if (HEX_INPUT.test(next)) onChange(`#${next.replace("#", "").toLowerCase()}`);
      }}
      onBlur={() => setText(value)}
      spellCheck={false}
      aria-label="Hex color"
      className="w-24 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-xs text-stone-200 outline-none focus:border-gold-400/50"
    />
  );
}
