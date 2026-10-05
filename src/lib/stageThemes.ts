/**
 * Stage themes.
 *
 * Built-in looks are full `StageTheme` paint records. User themes and edits
 * of built-ins are stored as `CustomThemeRecord` (fill, colors, angle) and
 * expanded here. `registerCustomThemes` fills the map `stageThemeById`
 * checks before the built-in list. Songs with a missing or deleted theme id
 * fall back to Sanctuary.
 */
import type { CSSProperties } from "react";

const FRAUNCES = '"Fraunces", Georgia, serif';
const OUTFIT = '"Outfit", system-ui, sans-serif';
const CORMORANT = '"Cormorant Garamond", Georgia, serif';
const OSWALD = '"Oswald", "Arial Narrow", sans-serif';

export type StageTheme = {
  id: string;
  name: string;
  blurb: string;
  /** Solid color for the picker swatch. */
  chip: string;
  background: string;
  color: string;
  fontFamily: string;
  fontWeight: number;
  letterSpacing: string;
  lineHeight: number;
  /** CSS filter, or "none" for flat type. */
  shadow: string;
  /** Multiplier on the stage font size so condensed or display faces stay balanced. */
  sizeScale: number;
  /** Light backgrounds need dark type and a darker preview edge. */
  light: boolean;
  /** Optional inset frame color on the output window. */
  frame?: string;
};

export const STAGE_THEMES: StageTheme[] = [
  {
    id: "sanctuary",
    name: "Sanctuary",
    blurb: "Warm gold glow, serif lyrics",
    chip: "#c4892e",
    background:
      "radial-gradient(1200px 600px at 50% 120%, rgba(196, 137, 46, 0.16), transparent 55%), radial-gradient(900px 500px at 50% -10%, rgba(255, 255, 255, 0.06), transparent 50%), #050505",
    color: "#ffffff",
    fontFamily: FRAUNCES,
    fontWeight: 500,
    letterSpacing: "0.025em",
    lineHeight: 1.22,
    shadow: "drop-shadow(0 8px 28px rgba(0, 0, 0, 0.55))",
    sizeScale: 1,
    light: false,
  },
  {
    id: "midnight",
    name: "Midnight",
    blurb: "Cool indigo, clean sans-serif",
    chip: "#7aa2ff",
    background:
      "radial-gradient(1000px 520px at 50% 115%, rgba(70, 120, 230, 0.28), transparent 55%), radial-gradient(800px 420px at 15% -10%, rgba(140, 170, 255, 0.12), transparent 50%), #070b16",
    color: "#eef3ff",
    fontFamily: OUTFIT,
    fontWeight: 500,
    letterSpacing: "0.01em",
    lineHeight: 1.28,
    shadow: "drop-shadow(0 6px 22px rgba(0, 0, 0, 0.6))",
    sizeScale: 1,
    light: false,
  },
  {
    id: "parchment",
    name: "Parchment",
    blurb: "Aged vellum, brown ink",
    chip: "#a86b45",
    background:
      "radial-gradient(ellipse 72% 58% at 50% 42%, rgba(214, 168, 116, 0.55), transparent 70%), radial-gradient(ellipse 125% 115% at 50% 52%, #8d5c40 0%, #4a3024 58%, #160e0c 100%)",
    color: "#1c120e",
    fontFamily: FRAUNCES,
    fontWeight: 500,
    letterSpacing: "0.018em",
    lineHeight: 1.3,
    shadow: "none",
    sizeScale: 1,
    light: true,
  },
  {
    id: "cathedral",
    name: "Cathedral",
    blurb: "Wine field, gold display type",
    chip: "#f0d48a",
    background:
      "radial-gradient(1100px 640px at 50% 120%, rgba(212, 168, 74, 0.2), transparent 52%), radial-gradient(720px 420px at 50% -20%, rgba(120, 24, 48, 0.55), transparent 55%), #14080d",
    color: "#f6e2a8",
    fontFamily: CORMORANT,
    fontWeight: 600,
    letterSpacing: "0.06em",
    lineHeight: 1.18,
    shadow: "drop-shadow(0 4px 16px rgba(0, 0, 0, 0.7))",
    sizeScale: 1.06,
    light: false,
    frame: "rgba(240, 212, 138, 0.55)",
  },
  {
    id: "daylight",
    name: "Daylight",
    blurb: "Muted stone with a warm sun",
    chip: "#7f9aab",
    background:
      "radial-gradient(ellipse 100% 26% at 50% 104%, rgba(196, 142, 90, 0.22), transparent 70%), radial-gradient(ellipse 90% 76% at 50% 40%, #a8becc 0%, #5a7284 55%, #243442 100%)",
    color: "#0e161c",
    fontFamily: OUTFIT,
    fontWeight: 500,
    letterSpacing: "0.02em",
    lineHeight: 1.28,
    shadow: "none",
    sizeScale: 1,
    light: true,
  },
  {
    id: "contrast",
    name: "High Contrast",
    blurb: "Flat black and white, condensed",
    chip: "#ffffff",
    background: "#000000",
    color: "#ffffff",
    fontFamily: OSWALD,
    fontWeight: 500,
    letterSpacing: "0.03em",
    lineHeight: 1.16,
    shadow: "none",
    sizeScale: 0.94,
    light: false,
  },
  {
    id: "pine",
    name: "Pine",
    blurb: "Deep green, soft serif",
    chip: "#8fbf7a",
    background:
      "radial-gradient(1000px 560px at 50% 115%, rgba(170, 150, 60, 0.16), transparent 55%), radial-gradient(780px 420px at 85% -10%, rgba(120, 170, 100, 0.14), transparent 50%), #07140e",
    color: "#e8f2e2",
    fontFamily: FRAUNCES,
    fontWeight: 500,
    letterSpacing: "0.02em",
    lineHeight: 1.26,
    shadow: "drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5))",
    sizeScale: 1,
    light: false,
  },
  {
    id: "ember",
    name: "Ember",
    blurb: "Amber glow, open sans-serif",
    chip: "#e07a3d",
    background:
      "radial-gradient(920px 500px at 50% 120%, rgba(220, 90, 28, 0.32), transparent 55%), radial-gradient(700px 380px at 50% -12%, rgba(255, 170, 70, 0.12), transparent 50%), #120804",
    color: "#fff6ee",
    fontFamily: OUTFIT,
    fontWeight: 500,
    letterSpacing: "0.035em",
    lineHeight: 1.26,
    shadow: "drop-shadow(0 8px 22px rgba(60, 16, 0, 0.6))",
    sizeScale: 1,
    light: false,
  },
  {
    id: "washed",
    name: "Washed",
    blurb: "Sunlit shallows, ocean blue",
    chip: "#297d9b",
    background:
      "radial-gradient(ellipse 78% 52% at 50% 28%, rgba(186, 224, 238, 0.72), transparent 68%), radial-gradient(ellipse 130% 115% at 50% 62%, #7ebbce 0%, #297696 50%, #114d6e 100%)",
    color: "#062636",
    fontFamily: OUTFIT,
    fontWeight: 500,
    letterSpacing: "0.02em",
    lineHeight: 1.28,
    shadow: "none",
    sizeScale: 1,
    light: true,
  },
  {
    id: "blood",
    name: "Blood",
    blurb: "Deep red, warm serif",
    chip: "#e25b68",
    background:
      "radial-gradient(1000px 520px at 50% 115%, rgba(210, 42, 58, 0.42), transparent 55%), radial-gradient(800px 420px at 15% -10%, rgba(255, 140, 145, 0.14), transparent 50%), #14060a",
    color: "#fff1f2",
    fontFamily: FRAUNCES,
    fontWeight: 500,
    letterSpacing: "0.02em",
    lineHeight: 1.24,
    shadow: "drop-shadow(0 6px 22px rgba(0, 0, 0, 0.6))",
    sizeScale: 1,
    light: false,
  },
];

export type StageThemeId = (typeof STAGE_THEMES)[number]["id"];

export type CustomFill = "solid" | "linear" | "radial" | "glow";

/** A user-made background. Saved to disk and turned into a full StageTheme on load. */
export type CustomThemeRecord = {
  id: string;
  name: string;
  fill: CustomFill;
  /** Hex colors. Solid uses the first; glow uses base then glow color. */
  colors: string[];
  /** Linear gradient direction in degrees. */
  angle: number;
};

export const CUSTOM_FILLS: { id: CustomFill; label: string; stops: [min: number, max: number] }[] = [
  { id: "solid", label: "Solid", stops: [1, 1] },
  { id: "linear", label: "Linear", stops: [2, 3] },
  { id: "radial", label: "Radial", stops: [2, 3] },
  { id: "glow", label: "Glow", stops: [2, 2] },
];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isCustomThemeRecord(value: unknown): value is CustomThemeRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as CustomThemeRecord;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    CUSTOM_FILLS.some((fill) => fill.id === record.fill) &&
    Array.isArray(record.colors) &&
    record.colors.length > 0 &&
    record.colors.every((color) => typeof color === "string" && HEX_COLOR.test(color)) &&
    typeof record.angle === "number"
  );
}

function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function customBackground(record: Pick<CustomThemeRecord, "fill" | "colors" | "angle">) {
  const [first, second = first] = record.colors;
  const stops = record.colors.join(", ");
  switch (record.fill) {
    case "solid":
      return first;
    case "linear":
      return `linear-gradient(${record.angle}deg, ${stops})`;
    case "radial":
      return `radial-gradient(ellipse 120% 110% at 50% 45%, ${stops})`;
    case "glow":
      return `radial-gradient(ellipse 80% 75% at 50% 115%, ${rgba(second, 0.45)}, transparent 70%), radial-gradient(ellipse 65% 55% at 50% -10%, ${rgba(second, 0.14)}, transparent 65%), ${first}`;
  }
}

/** Small-swatch version of a custom background. */
export function customChip(record: Pick<CustomThemeRecord, "fill" | "colors" | "angle">) {
  const [first, second = first] = record.colors;
  if (record.fill === "glow") return `radial-gradient(circle at 50% 100%, ${second}, ${first} 75%)`;
  return customBackground(record);
}

/** Expands a saved fill into a paintable theme. Light backgrounds get dark text. */
export function buildCustomTheme(record: CustomThemeRecord): StageTheme {
  // Glow backgrounds are mostly the base color, so only that decides the text color.
  const sampled = record.fill === "glow" ? record.colors.slice(0, 1) : record.colors;
  const average = sampled.reduce((sum, color) => sum + luminance(color), 0) / sampled.length;
  const light = average > 0.4;
  return {
    id: record.id,
    name: record.name,
    blurb: "Custom background",
    chip: customChip(record),
    background: customBackground(record),
    color: light ? "#14100c" : "#ffffff",
    fontFamily: FRAUNCES,
    fontWeight: 500,
    letterSpacing: "0.025em",
    lineHeight: 1.24,
    shadow: light ? "none" : "drop-shadow(0 6px 22px rgba(0, 0, 0, 0.6))",
    sizeScale: 1,
    light,
  };
}

/** Starting point for editing a built-in theme. The original look stays until this is saved. */
const DEFAULT_THEME_STARTS: Record<string, Pick<CustomThemeRecord, "fill" | "colors" | "angle">> = {
  sanctuary: { fill: "glow", colors: ["#050505", "#c4892e"], angle: 0 },
  midnight: { fill: "glow", colors: ["#070b16", "#7aa2ff"], angle: 0 },
  parchment: { fill: "radial", colors: ["#e4c9a4", "#a86b45", "#4a3024"], angle: 0 },
  cathedral: { fill: "glow", colors: ["#14080d", "#d4a84a"], angle: 0 },
  daylight: { fill: "radial", colors: ["#c5d5e0", "#7f9aab", "#243442"], angle: 0 },
  contrast: { fill: "solid", colors: ["#000000"], angle: 0 },
  pine: { fill: "glow", colors: ["#07140e", "#8fbf7a"], angle: 0 },
  ember: { fill: "glow", colors: ["#120804", "#e07a3d"], angle: 0 },
  washed: { fill: "radial", colors: ["#d4eef6", "#297d9b", "#114d6e"], angle: 0 },
  blood: { fill: "glow", colors: ["#14060a", "#e25b68"], angle: 0 },
};

export function editableDefaultTheme(theme: StageTheme): CustomThemeRecord {
  const start = DEFAULT_THEME_STARTS[theme.id] ?? { fill: "solid" as const, colors: [theme.chip], angle: 0 };
  return { id: theme.id, name: theme.name, ...start };
}

/** Built-in edits keep that theme's type. User-made themes use the standard lyric face. */
export function themeFromRecord(record: CustomThemeRecord): StageTheme {
  const built = buildCustomTheme(record);
  const original = STAGE_THEMES.find((theme) => theme.id === record.id);
  if (!original) return built;
  return {
    ...built,
    blurb: original.blurb,
    fontFamily: original.fontFamily,
    fontWeight: original.fontWeight,
    letterSpacing: original.letterSpacing,
    lineHeight: original.lineHeight,
    sizeScale: original.sizeScale,
    frame: original.frame,
  };
}

const customThemes = new Map<string, StageTheme>();

/** Replaces the custom themes that stageThemeById and songThemeId can resolve. */
export function registerCustomThemes(records: CustomThemeRecord[]) {
  customThemes.clear();
  for (const record of records) customThemes.set(record.id, themeFromRecord(record));
}

export function isDefaultThemeId(id: string) {
  return STAGE_THEMES.some((theme) => theme.id === id);
}

export function isStageThemeId(value: unknown): value is StageThemeId {
  return typeof value === "string" && (isDefaultThemeId(value) || customThemes.has(value));
}

export function stageThemeById(id: StageThemeId): StageTheme {
  return customThemes.get(id) ?? STAGE_THEMES.find((theme) => theme.id === id) ?? STAGE_THEMES[0];
}

/** Songs without a saved theme use the original Sanctuary look. */
export function songThemeId(song: { theme?: string } | null | undefined): StageThemeId {
  return isStageThemeId(song?.theme) ? song.theme : "sanctuary";
}

export function stageSurfaceStyle(theme: StageTheme): CSSProperties {
  return {
    background: theme.background,
    color: theme.color,
  };
}

export function stageLyricStyle(theme: StageTheme, fontSizePx?: number): CSSProperties {
  return {
    color: theme.color,
    fontFamily: theme.fontFamily,
    fontWeight: theme.fontWeight,
    letterSpacing: theme.letterSpacing,
    lineHeight: theme.lineHeight,
    filter: theme.shadow === "none" ? undefined : theme.shadow,
    ...(fontSizePx ? { fontSize: `${fontSizePx * theme.sizeScale}px` } : {}),
  };
}

export function stageEdgeColor(theme: StageTheme) {
  if (theme.frame) return theme.frame;
  return theme.light ? "rgba(42, 32, 22, 0.16)" : "rgba(255, 255, 255, 0.1)";
}

export function stageMutedColor(theme: StageTheme) {
  return theme.light ? "rgba(42, 32, 22, 0.45)" : "rgba(255, 255, 255, 0.45)";
}
