import { defineConfig, devices } from "@playwright/test";

/** The React Router majors the fixture app is served with, one port each */
const ROUTER_VERSIONS = [
  { name: "react-router-7", version: "7", port: 5181 },
  { name: "react-router-8", version: "8", port: 5182 },
];

/** A local Chromium to use instead of Playwright's download (optional) */
const executablePath = process.env.CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  /* One project per React Router version, each on its own server */
  projects: ROUTER_VERSIONS.map(({ name, port }) => ({
    name,
    use: {
      ...devices["Pixel 7"],
      baseURL: `http://localhost:${port}`,
      launchOptions: { executablePath },
    },
  })),

  webServer: ROUTER_VERSIONS.map(({ version, port }) => ({
    command: `vite --config e2e/vite.config.ts --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    env: { ROUTER_VERSION: version },
    reuseExistingServer: !process.env.CI,
  })),
});
