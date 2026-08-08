import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import parseArgs from "minimist";
import ts from "typescript";

/**
 * CI guard: fail if any .svelte or .ts file exceeds a maximum number of non-comment lines.
 *
 * Usage:
 *   node --import tsx scripts/check-file-length.ts [roots...] [--max <n>]
 *
 * Options:
 *   --max <n>  Maximum allowed line count (default: 200)
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

const DEFAULT_MAX = 200;

// Folders and files to skip. Tooling/build output first, then project exceptions.
const IGNORES = [
  "node_modules",
  ".git",
  ".svelte-kit",
  ".direnv",
  "build",
  "dist",
  "test-results",
  // Applied migrations are immutable historical artifacts, not maintainability refactor targets.
  "libs/database/migrations",
  // Generated database types are Kanel artifacts, not manual refactoring targets.
  "libs/types/src/database/public",
  // Declarative bulk seed data, not executable seed logic.
  "libs/database/seeds/dev/data/espece-taxref.ts",
  "libs/database/seeds/dev/data/espece-protegee-modification-ajouts.ts",
  "libs/database/seeds/fixtures/dossiers/records.ts",
];

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

  const withoutComments = [...content];
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    content,
  );
  let token = scanner.scan();

  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      token === ts.SyntaxKind.SingleLineCommentTrivia ||
      token === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      blankRange(withoutComments, scanner.getTokenPos(), scanner.getTextPos());
    }
    token = scanner.scan();
  }

  if (filePath.endsWith(".svelte")) {
    for (const match of content.matchAll(/<!--[\s\S]*?-->/g)) {
      blankRange(withoutComments, match.index, match.index + match[0].length);
    }
  }

  const originalLines = dropTrailingNewline(content).split("\n");
  const uncommentedLines = dropTrailingNewline(withoutComments.join("")).split("\n");
  return originalLines.filter(
    (line, index) => line.trim() === "" || uncommentedLines[index]?.trim() !== "",
  ).length;
}

function blankRange(content: string[], start: number, end: number): void {
  for (let index = start; index < end; index++) {
    if (content[index] !== "\n" && content[index] !== "\r") content[index] = " ";
  }
}

function dropTrailingNewline(content: string): string {
  return content.replace(/\r?\n$/, "");
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
  console.error(`The following ${violations.length} file(s) exceed ${max} non-comment lines:\n`);
  for (const { file, lines } of violations) {
    console.error(`  ${lines}\t${file}`);
  }
  console.error(
    `\nSplit them up, or add them to IGNORES in this script if an exception is warranted.`,
  );
  process.exit(1);
}

console.log(`OK: all ${files.length} .svelte/.ts file(s) are within ${max} non-comment lines.`);
