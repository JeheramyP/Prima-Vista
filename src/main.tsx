/**
 * Renderer entry.
 *
 * Hash routing lets one bundle open the controller (`#/`) or the output
 * (`#/presentation`) from a `file://` package and from the Vite dev server.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./fonts.css";
import "./index.css";

// Output is a second document (`#/presentation`). Only the controller gets the
// larger type; stage lyrics stay sized to the projector.
if (!window.location.hash.startsWith("#/presentation")) {
  document.documentElement.classList.add("controller");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
