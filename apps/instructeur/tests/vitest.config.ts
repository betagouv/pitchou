import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";
import { playwright } from "@vitest/browser-playwright";

// Run from apps/instructeur (cwd); globs are relative to this directory.
// Colocated unit tests live in the libs (../../libs) and in the app (src).
// Component tests live in src/lib (the app's client code).
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.direnv/**", "tests/e2e/**"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["../../libs/**/*.test.ts", "src/**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/*.svelte.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          include: ["src/**/*.svelte.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["./tests/setup/integration-global.ts"],
          setupFiles: ["./tests/setup/integration-each.ts"],
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
