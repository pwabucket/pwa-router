import { Route, Routes } from "react-router";

import { Home } from "./pages/Home";
import { usePWARouting } from "../hooks/usePWARouting";

function App() {
  const { resolvedLocation } = usePWARouting();

  return (
    <>
      <Routes location={resolvedLocation}>
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}

export default App;
