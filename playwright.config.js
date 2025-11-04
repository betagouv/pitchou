// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envPath = join(process.cwd(), '.env');
  const envFile = readFileSync(envPath, 'utf8');
  
  envFile.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }
    const [key, ...valueParts] = trimmedLine.split('=');
    const value = valueParts.join('='); 
    
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  });
} catch (error) {
  console.warn('Impossible de charger le fichier .env:', error.message);
}

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
  timeout: 10_000,

  use: {
    baseURL: 'http://127.0.0.1:2648/',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox"'],
        locale: 'fr',
      },
    },
  ],
});
