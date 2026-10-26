/**
 * Slide shortcuts shared by the controller page and the output window.
 *
 * The controller applies these while it is focused. The output window has no
 * slide state, so the main process recognizes the same keys and forwards them.
 * A held slide key must not repeat, so one press moves one slide. That
 * includes Space, the arrows, Page Up/Down, Backspace, Home, End, B, and C.
 */

export type SlideShortcut = {
  key: string;
  code: string;
  repeat: boolean;
};

export type SlideShortcutAction =
  | "next"
  | "prev"
  | "first"
  | "last"
  | "blackout"
  | "clear"
  | "ignore-repeat";

export function slideShortcutAction(input: {
  key: string;
  code: string;
  repeat?: boolean;
}): SlideShortcutAction | null {
  const key = input.key;
  const lower = key.toLowerCase();
  let action: SlideShortcutAction | null = null;

  if (input.code === "Space" || key === "ArrowRight" || key === "ArrowDown" || key === "PageDown") {
    action = "next";
  } else if (key === "ArrowLeft" || key === "ArrowUp" || key === "PageUp" || key === "Backspace") {
    action = "prev";
  } else if (key === "Home") {
    action = "first";
  } else if (key === "End") {
    action = "last";
  } else if (lower === "b" && key.length === 1) {
    action = "blackout";
  } else if (lower === "c" && key.length === 1) {
    action = "clear";
  }

  if (!action) return null;

  if (input.repeat) return "ignore-repeat";
  return action;
}
