import { promisify } from "node:util";
import { columnDescriptions } from "@pitchou/common/onagre/schema.ts";
import { spawn, execFile } from "node:child_process";
import { copyLines } from "@pitchou/common/onagre/lines.ts";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { writeFullPackage } from "./stream.ts";
import { readCopyHeader, readCopyRow } from "@pitchou/common/onagre/copy.ts";
import { readOnagreWorkbook } from "@pitchou/common/onagre/workbook.ts";
import type { OnagreBundle, OnagreTable } from "@pitchou/types/onagre.ts";

const [dumpPath, workbookPath, outputPath] = process.argv.slice(2);
if (!dumpPath || !workbookPath || !outputPath)
  throw new Error("Usage: prepare.ts DUMP WORKBOOK OUTPUT.json");
const hash = createHash("sha256");
for await (const chunk of createReadStream(dumpPath)) hash.update(chunk);
const workbook = await readFile(workbookPath);
const bundle: OnagreBundle = {
  format: "pitchou-onagre-v1",
  fingerprint: hash.digest("hex"),
  workbookFingerprint: createHash("sha256").update(workbook).digest("hex"),
  filename: basename(dumpPath),
  tables: [],
  mappings: readOnagreWorkbook(workbook),
  demandes: [],
  projets: [],
};
// Never execute SQL from a supplied backup. pg_restore only decodes COPY data to stdout.
const child = spawn(
  "pg_restore",
  ["--data-only", "--no-owner", "--no-privileges", "--file=-", dumpPath],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr = (stderr + chunk).slice(-4000);
});
const settled = new Promise<Error | null>((resolve) => {
  child.once("error", resolve);
  child.once("close", (code) =>
    resolve(code === 0 ? null : new Error(`pg_restore failed (${code}): ${stderr}`)),
  );
});
let current: OnagreTable | null = null;
try {
  for await (const line of copyLines(child.stdout)) {
    if (line === "\\.") {
      current = null;
      continue;
    }
    if (!current) {
      const header = readCopyHeader(line);
      if (header) {
        current = { ...header, count: 0, samples: [] };
        bundle.tables.push(current);
      }
      continue;
    }
    current.count++;
    if (current.samples.length < 3 || ["demandes", "projet"].includes(current.name)) {
      const row = readCopyRow(line, current.columns);
      if (current.samples.length < 3) current.samples.push(row);
      if (current.name === "demandes") bundle.demandes.push(row);
      if (current.name === "projet") bundle.projets.push(row);
    }
  }
} catch (error) {
  child.kill();
  await settled;
  throw error;
}
const failure = await settled;
if (failure) throw failure;
if (bundle.demandes.length === 0 || bundle.projets.length === 0)
  throw new Error("Le dump ne contient pas les tables demandes et projet attendues.");
const { stdout: schema } = await promisify(execFile)(
  "pg_restore",
  ["--schema-only", "--no-owner", "--no-privileges", "--file=-", dumpPath],
  { maxBuffer: 32 * 1024 * 1024 },
);
const descriptions = columnDescriptions(schema);
const known = new Set(bundle.mappings.map((entry) => entry.key));
for (const table of bundle.tables)
  for (const column of table.columns) {
    const key = `field:${table.name}.${column}`;
    if (!known.has(key))
      bundle.mappings.push({
        key,
        section: table.name,
        label: column,
        context: descriptions.get(`${table.name}.${column}`) ?? "Champ du dump Onagre",
        proposal: "",
        confidence: "",
        notes: "",
      });
  }
if (outputPath.endsWith(".jsonl.gz")) await writeFullPackage(dumpPath, outputPath, bundle);
else await writeFile(outputPath, JSON.stringify(bundle), { mode: 0o600, flag: "wx" });
console.log(
  JSON.stringify({
    tables: bundle.tables.length,
    rows: bundle.tables.reduce((total, table) => total + table.count, 0),
    demandes: bundle.demandes.length,
    projets: bundle.projets.length,
    mappings: bundle.mappings.length,
    fingerprint: bundle.fingerprint,
  }),
);
