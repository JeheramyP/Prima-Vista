/** Native confirm that gives keyboard focus back to the window afterward. */
export function confirmDialog(message: string): boolean {
  const confirmed = window.confirm(message);
  // Defer until after the click handler and the following React render, so a
  // button removed by the confirmed action is gone before focus is restored.
  window.setTimeout(() => window.primaVista?.restoreWindowFocus(), 0);
  return confirmed;
}
