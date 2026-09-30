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

export function isStageThemeId(value: unknown): value is StageThemeId {
  return typeof value === "string" && STAGE_THEMES.some((theme) => theme.id === value);
}

export function stageThemeById(id: StageThemeId): StageTheme {
  return STAGE_THEMES.find((theme) => theme.id === id) ?? STAGE_THEMES[0];
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
