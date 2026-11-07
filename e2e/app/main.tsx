import { Profiler, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PWARouter, Route, RouterStatusProbe, Routes } from "../../src";
import { scenarios } from "./scenarios";

/** Home under deep links, turned on per test with ?deep-link-home */
const deepLinkHome = new URLSearchParams(location.search).has("deep-link-home")
  ? "/"
  : undefined;

/** Counts every commit of the app, read by the end-to-end tests as window.appCommits */
const countCommit = () => {
  const counter = window as unknown as { appCommits?: number };
  counter.appCommits = (counter.appCommits ?? 0) + 1;
};

/* The fixture app: one route per scenario, the plain page for the rest, its commits counted */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Profiler id="app" onRender={countCommit}>
      <PWARouter deepLinkHome={deepLinkHome}>
        <RouterStatusProbe />
        <Routes>
          {scenarios.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Routes>
      </PWARouter>
    </Profiler>
  </StrictMode>,
);
