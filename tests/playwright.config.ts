import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  globalSetup: "./setup/e2e-global.ts",
  use: {
    baseURL: "http://127.0.0.1:32648/",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        locale: "fr",
      },
    },
  ],
});
