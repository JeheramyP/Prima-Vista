/**
 * Custom theme panel.
 *
 * Edits a fill, one to three hex colors, a linear angle, or an uploaded
 * background image, with named presets as starting points. The preview is a
 * real `StageTheme` from `themeFromRecord`, so type and contrast match the
 * output. Saving reports a `CustomThemeRecord`. It does not write the file itself.
 * The panel is portaled and sized to the space left in the window, with Cancel
 * and Save pinned, so a long form cannot run off the screen.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
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
const MAX_IMAGE_EDGE = 1600;
const MAX_IMAGE_DATA_URL = 1_200_000;
const PANEL_MARGIN = 12;
const PANEL_GAP = 8;
const PANEL_WIDTH = 380;

type PanelBox = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

/** Fits the panel in the window, opening upward when the space below is shorter. */
function placePanel(anchor: HTMLElement): PanelBox {
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(PANEL_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
  const left = Math.min(
    Math.max(PANEL_MARGIN, rect.left),
    Math.max(PANEL_MARGIN, window.innerWidth - PANEL_MARGIN - width),
  );
  const spaceBelow = window.innerHeight - rect.bottom - PANEL_MARGIN - PANEL_GAP;
  const spaceAbove = rect.top - PANEL_MARGIN - PANEL_GAP;
  if (spaceBelow < 280 && spaceAbove > spaceBelow) {
    return {
      left,
      width,
      maxHeight: Math.max(0, spaceAbove),
      bottom: window.innerHeight - rect.top + PANEL_GAP,
    };
  }
  return {
    left,
    width,
    maxHeight: Math.max(0, spaceBelow),
    top: rect.bottom + PANEL_GAP,
  };
}

/** Shrinks a photo to a JPEG data URL and samples one tone for lyric contrast. */
async function themeImageFromFile(file: File): Promise<{ image: string; tone: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 25 * 1024 * 1024) throw new Error("That image is too large.");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Couldn't read that image.");
  });
  try {
    const tone = averageTone(bitmap);
    let edge = MAX_IMAGE_EDGE;
    let quality = 0.82;
    let dataUrl = "";
    for (let attempt = 0; attempt < 4; attempt++) {
      dataUrl = paintThemeImage(bitmap, edge, quality);
      if (dataUrl.length <= MAX_IMAGE_DATA_URL) return { image: dataUrl, tone };
      edge = Math.round(edge * 0.75);
      quality = Math.max(0.55, quality - 0.1);
    }
    throw new Error("That image is too large to save as a theme.");
  } finally {
    bitmap.close();
  }
}

function paintThemeImage(bitmap: ImageBitmap, maxEdge: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't read that image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function averageTone(bitmap: ImageBitmap) {
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return FALLBACK_PALETTE[0];
  ctx.drawImage(bitmap, 0, 0, 24, 24);
  const { data } = ctx.getImageData(0, 0, 24, 24);
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }
  if (!count) return FALLBACK_PALETTE[0];
  const channel = (value: number) => Math.round(value / count).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function stopLabel(fill: CustomFill, index: number) {
  if (fill === "solid") return "Color";
  if (fill === "glow") return index === 0 ? "Base" : "Glow";
  return `Stop ${index + 1}`;
}

export default function CustomThemeEditor({
  suggestedName,
  initial,
  anchorRef,
  ignoreRef,
  onSave,
  onClose,
}: {
  suggestedName: string;
  /** When set, the panel edits this theme instead of creating one. */
  initial?: CustomThemeRecord;
  /** Element the panel hangs from. The panel is portaled so ancestors cannot clip it. */
  anchorRef: RefObject<HTMLElement | null>;
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
  const [image, setImage] = useState(initial?.fill === "image" ? (initial.image ?? "") : "");
  const [imageTone, setImageTone] = useState(initial?.colors[0] ?? FALLBACK_PALETTE[0]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [readingImage, setReadingImage] = useState(false);
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
        colors: fill === "image" ? [imageTone] : colors,
        angle,
        image: fill === "image" ? image : undefined,
      }),
    [angle, colors.join(), fill, image, imageTone, initial?.id, name, suggestedName],
  );

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const update = () => {
      const box = placePanel(anchor);
      panel.style.left = `${box.left}px`;
      panel.style.width = `${box.width}px`;
      panel.style.maxHeight = `${Math.max(box.maxHeight, 0)}px`;
      if (box.top != null) {
        panel.style.top = `${box.top}px`;
        panel.style.bottom = "auto";
      } else {
        panel.style.top = "auto";
        panel.style.bottom = `${box.bottom}px`;
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef]);

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

  const chooseImage = async (file: File | undefined) => {
    if (!file) return;
    setImageError(null);
    setReadingImage(true);
    try {
      const prepared = await themeImageFromFile(file);
      setFill("image");
      setImage(prepared.image);
      setImageTone(prepared.tone);
      setName((current) => {
        if (current.trim()) return current;
        const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
        return base.slice(0, 32);
      });
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Couldn't read that image.");
    } finally {
      setReadingImage(false);
    }
  };

  const save = () => {
    if (fill === "image" && !image) return;
    onSave({
      id: initial?.id ?? createCustomThemeId(),
      name: name.trim() || suggestedName,
      fill,
      colors: fill === "image" ? [imageTone] : colors,
      angle,
      ...(fill === "image" ? { image } : {}),
    });
  };

  const canSave = (fill !== "image" || Boolean(image)) && !readingImage;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={editingBuiltIn ? "Edit built-in theme" : initial ? "Edit custom theme" : "New custom theme"}
      className="fixed z-50 flex max-h-[calc(100dvh-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-sanctuary-950/95 shadow-stage backdrop-blur"
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
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
        <div role="radiogroup" aria-label="Background style" className="grid grid-cols-5 gap-1 rounded-lg bg-white/[0.04] p-1">
          {CUSTOM_FILLS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={fill === option.id}
              onClick={() => chooseFill(option.id)}
              className={`rounded-md px-1 py-1 text-[11px] font-medium transition ${
                fill === option.id ? "bg-white text-sanctuary-950" : "text-stone-400 hover:text-stone-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {fill !== "image" && (
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
      )}

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

      <div className="mb-4">
        <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.22em] text-stone-500">
          Background image
        </span>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-stone-200 transition hover:border-gold-400/50 hover:text-gold-50">
            {readingImage ? "Reading…" : fill === "image" && image ? "Replace image" : "Upload image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={readingImage}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void chooseImage(file);
              }}
            />
          </label>
          {image && fill === "image" && (
            <button
              type="button"
              onClick={() => {
                setImage("");
                setImageError(null);
              }}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-stone-400 transition hover:text-stone-200"
            >
              Remove
            </button>
          )}
        </div>
        {imageError ? (
          <p className="mt-1.5 text-xs text-red-300">{imageError}</p>
        ) : (
          <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
            JPEG, PNG, WebP, or GIF. The picture fills the stage.
          </p>
        )}
      </div>

      {editingBuiltIn && (
        <p className="mb-3 text-xs leading-relaxed text-stone-500">
          Saving replaces this built-in look. Reset built-in themes restores the originals and leaves custom themes alone.
        </p>
      )}

      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 bg-sanctuary-950 px-4 py-3">
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
          disabled={!canSave}
          className="rounded-lg border border-gold-500/30 bg-gold-500/15 px-3 py-1.5 text-xs font-medium text-gold-50 transition hover:bg-gold-500/25 disabled:cursor-default disabled:opacity-40"
        >
          {initial ? "Save changes" : "Save theme"}
        </button>
      </div>
    </div>,
    document.body,
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
