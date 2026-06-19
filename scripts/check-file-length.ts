import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import parseArgs from "minimist";

/**
 * CI guard: fail if any .svelte or .ts file exceeds a maximum number of lines.
 *
 * Usage:
 *   node --import tsx scripts/check-file-length.ts [roots...] [--max <n>]
 *
 * Options:
 *   --max <n>  Maximum allowed line count (default: 300)
 *
 * Examples:
 *   node --import tsx scripts/check-file-length.ts
 *   node --import tsx scripts/check-file-length.ts --max 400
 *
 * The list of ignored paths is baked in below (IGNORES) — edit it to add an
 * exception. An entry without a slash (e.g. "node_modules") matches that
 * folder/file name at any depth; an entry with a slash (e.g.
 * "apps/admin/src/legacy.ts") matches that exact path relative to the repo root.
 */

const DEFAULT_MAX = 300;

// Folders and files to skip. Tooling/build output first, then project exceptions.
const IGNORES = ["node_modules", ".git", ".svelte-kit", ".direnv", "build", "dist", "test-results"];

const args = parseArgs(process.argv.slice(2), {
  default: { max: DEFAULT_MAX },
});

const max = Number(args.max);
if (!Number.isInteger(max) || max <= 0) {
  console.error(`Invalid --max value: ${args.max}. Expected a positive integer.`);
  process.exit(1);
}

const roots = args._.length > 0 ? args._.map(String) : ["."];

const repoRoot = process.cwd();

// An entry without a slash matches that folder/file name at any depth; an entry
// with a slash matches an exact path relative to the repo root.
const nameIgnores = new Set(IGNORES.filter((entry) => !entry.includes("/")));
const pathIgnores = new Set(IGNORES.filter((entry) => entry.includes("/")).map(normalise));

/** Turn a path into a comparable form: relative to the repo root, with `/` separators and no trailing slash. */
function normalise(path: string): string {
  const rel = relative(repoRoot, resolve(repoRoot, path));
  return rel.split(sep).join("/").replace(/\/+$/, "");
}

/** A path is ignored if any segment matches a name ignore, or it sits under a path ignore. */
function isIgnored(relPath: string): boolean {
  const name = relPath.split("/").pop()!;
  if (nameIgnores.has(name)) return true;
  if (pathIgnores.has(relPath)) return true;
  for (const entry of pathIgnores) {
    if (relPath.startsWith(`${entry}/`)) return true;
  }
  return false;
}

async function collectFiles(dir: string, found: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = normalise(fullPath);
    if (isIgnored(relPath)) continue;

    if (entry.isDirectory()) {
      await collectFiles(fullPath, found);
    } else if (entry.isFile() && /\.(svelte|ts)$/.test(entry.name)) {
      found.push(fullPath);
    }
  }
}

function countLines(filePath: string): number {
  const content = readFileSync(filePath, "utf8");
  if (content === "") return 0;
  // A trailing newline does not start a new line, so drop it before counting.
  return content.replace(/\n$/, "").split("\n").length;
}

const files: string[] = [];
for (const root of roots) {
  await collectFiles(join(repoRoot, root), files);
}

const violations = files
  .map((file) => ({ file: normalise(file), lines: countLines(file) }))
  .filter(({ lines }) => lines > max)
  .sort((a, b) => b.lines - a.lines);

if (violations.length > 0) {
  console.error(`The following ${violations.length} file(s) exceed ${max} lines:\n`);
  for (const { file, lines } of violations) {
    console.error(`  ${lines}\t${file}`);
  }
  console.error(
    `\nSplit them up, or add them to IGNORES in this script if an exception is warranted.`,
  );
  process.exit(1);
}

console.log(`OK: all ${files.length} .svelte/.ts file(s) are within ${max} lines.`);
