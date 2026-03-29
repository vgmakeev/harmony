import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5177',
    headless: true,
  },
  webServer: {
    command: 'npx vite dev --port 5177',
    port: 5177,
    reuseExistingServer: true,
  },
});
