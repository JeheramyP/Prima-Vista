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
