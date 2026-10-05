/**
 * Route split.
 *
 * The controller is the only route wrapped in `PresentationProvider`. The
 * output window paints IPC payloads and must not mount that provider, or it
 * would become a second writer of the library and the live slide.
 */
import { Route, Routes } from "react-router-dom";
import { PresentationProvider } from "./state/PresentationContext";
import ControllerView from "./views/ControllerView";
import PresentationView from "./views/PresentationView";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PresentationProvider>
            <ControllerView />
          </PresentationProvider>
        }
      />
      <Route path="/presentation" element={<PresentationView />} />
    </Routes>
  );
}
