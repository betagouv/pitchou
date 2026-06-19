import { defineConfig } from "vitest/config";
import { sveltekit } from "@sveltejs/kit/vite";

// Runs from apps/admin (cwd); globs are relative to that folder.
// Colocated unit tests live in the app (src).
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.direnv/**"],
    projects: [
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
