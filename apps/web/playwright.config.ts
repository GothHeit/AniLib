import { defineConfig } from "@playwright/test";

const PORT = 3100;
const API_PORT = 4010;

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: [
    {
      command: "node e2e/fake-api.mjs",
      env: { FAKE_API_PORT: String(API_PORT) },
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm start --port ${PORT}`,
      env: { API_URL: `http://localhost:${API_PORT}` },
      url: `http://localhost:${PORT}/pt/login`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
