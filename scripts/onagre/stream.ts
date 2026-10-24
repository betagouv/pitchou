import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { copyLines } from "@pitchou/common/onagre/lines.ts";
import { readCopyHeader, readCopyRow } from "@pitchou/common/onagre/copy.ts";
import type { OnagreBundle, SourceRow } from "@pitchou/types/onagre.ts";

async function* packageLines(dumpPath: string, bundle: OnagreBundle) {
  yield JSON.stringify({ format: "pitchou-onagre-stream-v1", bundle }) + "\n";
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
  let current: ReturnType<typeof readCopyHeader> = null;
  let rows: SourceRow[] = [];
  try {
    for await (const line of copyLines(child.stdout)) {
      if (line === "\\.") {
        if (current && rows.length > 0) yield JSON.stringify({ table: current.name, rows }) + "\n";
        current = null;
        rows = [];
      } else if (current) {
        rows.push(readCopyRow(line, current.columns));
        if (rows.length === 500) {
          yield JSON.stringify({ table: current.name, rows }) + "\n";
          rows = [];
        }
      } else current = readCopyHeader(line);
    }
    const failure = await settled;
    if (failure) throw failure;
  } finally {
    if (child.exitCode === null) child.kill();
    await settled;
  }
}

export async function writeFullPackage(dumpPath: string, outputPath: string, bundle: OnagreBundle) {
  await pipeline(
    Readable.from(packageLines(dumpPath, bundle)),
    createGzip(),
    createWriteStream(outputPath, { mode: 0o600, flags: "wx" }),
  );
}
