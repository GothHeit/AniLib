import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/pt`,
    reuseExistingServer: !process.env.CI,
  },
});
