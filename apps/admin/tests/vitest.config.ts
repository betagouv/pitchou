import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";
import { playwright } from "@vitest/browser-playwright";
import tailwindcss from "@tailwindcss/vite";

// Runs from apps/admin (cwd); globs are relative to that folder.
// Colocated unit tests live in the app (src).
export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.direnv/**"],
    projects: [
      {
        extends: true,
        test: {
          name: "component",
          include: ["src/**/*.svelte.test.ts"],
          browser: {
            enabled: true,
            provider: playwright({
              launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
            }),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/*.svelte.test.ts"],
        },
      },
    ],
  },
});
