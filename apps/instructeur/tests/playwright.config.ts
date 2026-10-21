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
      testIgnore: "**/dossier-cartographie.spec.ts",
      use: {
        ...devices["Desktop Firefox"],
        locale: "fr",
        timezoneId: "Europe/Paris",
      },
    },
    {
      name: "chromium-map",
      testMatch: "**/dossier-cartographie.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        locale: "fr",
        timezoneId: "Europe/Paris",
        // Software WebGL keeps this test independent of the CI host's GPU and drivers.
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
      },
    },
  ],
});
