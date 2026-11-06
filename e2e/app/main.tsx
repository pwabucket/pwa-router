import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PWARouter, Route, RouterStatusProbe, Routes } from "../../src";
import { scenarios } from "./scenarios";

/** Home under deep links, turned on per test with ?deep-link-home */
const deepLinkHome = new URLSearchParams(location.search).has("deep-link-home")
  ? "/"
  : undefined;

/* The fixture app: one route per scenario, the plain page for the rest */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PWARouter deepLinkHome={deepLinkHome}>
      <RouterStatusProbe />
      <Routes>
        {scenarios.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Routes>
    </PWARouter>
  </StrictMode>,
);
