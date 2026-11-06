import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: "./tsconfig.app.json",
      bundleTypes: true,
    }),
  ],
  build: {
    lib: {
      name: "@pwabucket/pwa-router",
      entry: {
        index: path.resolve(import.meta.dirname, "src/index.ts"),
        testing: path.resolve(import.meta.dirname, "src/testing/index.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "react",
        "react-router",
        "react/jsx-runtime",
        "@playwright/test",
      ],
    },
  },
});
