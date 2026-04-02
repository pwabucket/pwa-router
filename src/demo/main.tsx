import App from "./App.tsx";
import { BrowserRouter } from "react-router";
import { PWARoutingProvider } from "../providers/PWARoutingProvider.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PWARoutingProvider>
        <App />
      </PWARoutingProvider>
    </BrowserRouter>
  </StrictMode>,
);
