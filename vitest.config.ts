import { defineConfig } from "vitest/config";

// Unit tests of the pure core
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
