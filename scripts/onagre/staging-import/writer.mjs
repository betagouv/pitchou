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

/** Scalingo refuses `run --file` uploads over 100 MB; keep a margin for each part. */
export const uploadLimitBytes = 95_000_000;

/** `bundle.json.gz` stays as is for one part, else becomes `bundle-part-1-of-3.json.gz`, … */
export function partOutputs(output, parts) {
  if (parts === 1) return [output];
  if (!output.endsWith(".json.gz")) throw new Error("Name a multi-part bundle `….json.gz`");
  return Array.from({ length: parts }, (_, index) =>
    output.replace(/\.json\.gz$/u, `-part-${index + 1}-of-${parts}.json.gz`),
  );
}

/** Exactly `parts` contiguous chunks whose sizes differ by at most one, in numeric order. */
export function splitFiles(files, parts) {
  const bounds = Array.from({ length: parts + 1 }, (_, index) =>
    Math.round((index * files.length) / parts),
  );
  return bounds.slice(0, -1).map((start, index) => files.slice(start, bounds[index + 1]));
}

async function writePart({ files, output, reviewedThrough, part }) {
  async function* rows() {
    yield bundleLine({
      formatVersion: 1,
      target: "pitchou-staging",
      reviewedThrough,
      ...(part ? { part } : {}),
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
  await pipeline(
    Readable.from(rows()),
    createGzip(),
    fs.createWriteStream(output, { flags: "wx", mode: 0o600 }),
  );
  const bytes = fs.readFileSync(output);
  return { path: output, projects: files.length, bytes: bytes.length, sha256: hash(bytes) };
}

/**
 * Writes the reviewed staging bundle in one or more parts: each part has a header, then one
 * checksummed project per line, gzipped, and is imported on its own with its own SHA256.
 * Species reference rows are not included: staging already holds the local reference tables, and
 * a project that needs a missing row fails individually in the import report.
 */
export async function writeBundle({
  projectsDirectory,
  output,
  reviewedThrough,
  parts = 1,
  maxBytes = uploadLimitBytes,
}) {
  if (typeof reviewedThrough !== "string" || !reviewedThrough.trim())
    throw new Error("Name the reviewed cutoff of this bundle");
  const files = projectFiles(projectsDirectory);
  if (files.length === 0) throw new Error("No prepared project files");
  if (!Number.isInteger(parts) || parts < 1 || parts > files.length)
    throw new Error("Choose a number of parts between 1 and the number of projects");
  const chunks = splitFiles(files, parts);
  const outputs = partOutputs(output, chunks.length);
  const existing = outputs.find((name) => fs.existsSync(name));
  if (existing)
    throw Object.assign(new Error(`EEXIST: ${existing} already exists`), { code: "EEXIST" });
  // Every part this run started, so a failure removes them all and leaves no partial bundle.
  const started = [],
    results = [];
  try {
    for (const [index, chunk] of chunks.entries()) {
      started.push(outputs[index]);
      const result = await writePart({
        files: chunk,
        output: outputs[index],
        reviewedThrough,
        part: chunks.length > 1 ? `${index + 1}/${chunks.length}` : undefined,
      });
      if (result.bytes > maxBytes)
        throw new Error(
          `${path.basename(result.path)} is ${result.bytes} bytes, over the ${maxBytes}-byte upload limit; use more parts`,
        );
      results.push(result);
    }
  } catch (error) {
    // Never remove a bundle created by someone else between the check and the write.
    for (const name of started)
      if (!(error.code === "EEXIST" && error.path === name)) fs.rmSync(name, { force: true });
    throw error;
  }
  return results;
}
