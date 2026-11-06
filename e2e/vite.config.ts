import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

/** The React Router major to serve the fixture app with (default: 7) */
const routerVersion = process.env.ROUTER_VERSION ?? "7";

// The fixture app that the end-to-end tests drive
export default defineConfig({
  root: path.resolve(import.meta.dirname, "app"),
  plugins: [react()],
  resolve: {
    /* react-router-8 is the aliased install of React Router 8 */
    alias:
      routerVersion === "8" ? { "react-router": "react-router-8" } : undefined,
  },
});
