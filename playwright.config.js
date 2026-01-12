// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 * @see https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/deviceDescriptorsSource.json
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 20_000,

  use: {
    baseURL: 'http://127.0.0.1:32648/',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        locale: 'fr'
      },
    },
  ],

  webServer: {
    command: 'docker compose -f compose-tests.yml up',
    url: 'http://127.0.0.1:32648',
    reuseExistingServer: true,
    timeout: 120_000
  },

});
