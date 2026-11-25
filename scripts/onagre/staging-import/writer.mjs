import fs from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { hash } from "./bundle.mjs";
import { validateProjects } from "../local-import/projects.mjs";

// The reader splits lines on these separators too; some prepared projects contain them.
const separators = new RegExp(`[${String.fromCodePoint(0x2028, 0x2029, 0x85)}]`, "gu");

/** One NDJSON line; the JSON escapes keep each row on a single physical line. */
export function bundleLine(value) {
  return (
    JSON.stringify(value).replaceAll(
      separators,
      (char) => `\\u${char.codePointAt(0).toString(16).padStart(4, "0")}`,
    ) + "\n"
  );
}

/** Prepared project files, in numeric project order. */
export function projectFiles(directory) {
  return fs
    .readdirSync(directory)
    .filter((name) => /^[1-9]\d*\.json$/u.test(name))
    .sort((a, b) => Number(a.slice(0, -5)) - Number(b.slice(0, -5)))
    .map((name) => path.join(directory, name));
}

/**
 * Writes the reviewed staging bundle: a header, then one checksummed project per line, gzipped.
 * Species reference rows are not included: staging already holds the local reference tables, and
 * a project that needs a missing row fails individually in the import report.
 */
export async function writeBundle({ projectsDirectory, output, reviewedThrough }) {
  if (typeof reviewedThrough !== "string" || !reviewedThrough.trim())
    throw new Error("Name the reviewed cutoff of this bundle");
  const files = projectFiles(projectsDirectory);
  if (files.length === 0) throw new Error("No prepared project files");
  async function* rows() {
    yield bundleLine({
      formatVersion: 1,
      target: "pitchou-staging",
      reviewedThrough,
      projectCount: files.length,
      references: [],
    });
    for (const file of files) {
      const bytes = fs.readFileSync(file);
      let project;
      try {
        project = JSON.parse(bytes);
        validateProjects([project]);
      } catch (error) {
        throw new Error(`${path.basename(file)}: ${error.message}`, { cause: error });
      }
      yield bundleLine({
        project,
        sha256: hash(JSON.stringify(project)),
        sourceSha256: hash(bytes),
      });
    }
  }
  // `wx` refuses to replace an existing bundle whose SHA256 may already have been reviewed.
  try {
    await pipeline(
      Readable.from(rows()),
      createGzip(),
      fs.createWriteStream(output, { flags: "wx", mode: 0o600 }),
    );
  } catch (error) {
    // A partial bundle would otherwise block the next run with a misleading EEXIST.
    if (error.code !== "EEXIST") fs.rmSync(output, { force: true });
    throw error;
  }
  return { projects: files.length, sha256: hash(fs.readFileSync(output)) };
}
