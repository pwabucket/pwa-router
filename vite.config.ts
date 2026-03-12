import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [dts({ tsconfigPath: "./tsconfig.app.json", rollupTypes: true })],
  build: {
    lib: {
      name: "@pwabucket/pwa-router",
      entry: path.resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs.js"),
    },
    rollupOptions: {
      external: ["react", "react-router", "react/jsx-runtime"],
    },
  },
});
