import { Outlet, Route, Routes } from "react-router-dom";
import { PresentationProvider } from "./state/PresentationContext";
import ControllerView from "./views/ControllerView";
import PresentationView from "./views/PresentationView";

function ControllerLayout() {
  return (
    <PresentationProvider>
      <Outlet />
    </PresentationProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<ControllerLayout />}>
        <Route path="/" element={<ControllerView />} />
        <Route path="/new" element={<ControllerView mode="new" />} />
      </Route>
      <Route path="/presentation" element={<PresentationView />} />
    </Routes>
  );
}
