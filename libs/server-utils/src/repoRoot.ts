import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Resolve the repo root at runtime by walking up from the current working directory
// until the pnpm workspace marker is found.
function findRepoRoot(start: string): string {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

// data/ and docs/ live at the repo root, shared across the apps, the worker and the scripts.
export const REPO_ROOT = findRepoRoot(process.cwd());
