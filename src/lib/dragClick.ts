/**
 * Drag-end click guard.
 *
 * A drag that ends over a button still dispatches click after dragend.
 * Song and setlist rows are draggable wrappers around those buttons, so that
 * click would select the song, leave setlist follow, or make a reordered row live.
 */
let dragReleasePending = false;

export function beginDragClickGuard() {
  dragReleasePending = true;
}

/** Drop the flag after the click that follows dragend has been ignored. */
export function endDragClickGuard() {
  window.setTimeout(() => {
    dragReleasePending = false;
  }, 0);
}

export function ignoreClickAfterDrag(event: {
  preventDefault(): void;
  stopPropagation(): void;
}) {
  if (!dragReleasePending) return;
  event.preventDefault();
  event.stopPropagation();
  dragReleasePending = false;
}
