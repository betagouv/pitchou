import { spawn } from "node:child_process";

import { error, json } from "@sveltejs/kit";
import { getDemarcheNumerique88444SynchronizationResults } from "@pitchou/server/database.ts";

import type { RequestHandler } from "./$types";

// The sync worker records one row per outcome in
// demarche_numerique_88444_synchronization_result, but only once it managed to
// start. This module-level state covers the rest: knowing a run is in
// progress, streaming its logs to the tech page, and surfacing failures that
// never reach the database (missing env var, crash before the try/catch). One
// node process serves the admin app, so module state is enough as a
// concurrency guard against double-triggering from this page; the
// every-10-minutes cron can still overlap with a long backfill.
type SyncRun = {
  startedAt: Date;
  lastModified: Date;
  finishedAt: Date | null;
  exitCode: number | null;
};

let currentRun: SyncRun | null = null;

// Rolling log of the current/last run. `logStart` is the absolute offset of
// logBuffer[0] since the run began, so clients can poll incrementally with
// ?logOffset= and still detect truncation when the buffer cap drops the head.
const LOG_BUFFER_MAX_LENGTH = 2_000_000;
let logBuffer = "";
let logStart = 0;

function appendLog(chunk: string) {
  logBuffer += chunk;
  if (logBuffer.length > LOG_BUFFER_MAX_LENGTH) {
    logStart += logBuffer.length - LOG_BUFFER_MAX_LENGTH;
    logBuffer = logBuffer.slice(-LOG_BUFFER_MAX_LENGTH);
  }
}

const INCEPTION_DATE = new Date("2024-01-01T00:00:00+01:00");

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async ({ url }) => {
  const results = await getDemarcheNumerique88444SynchronizationResults();

  const requestedOffset = Number(url.searchParams.get("logOffset") ?? 0);
  const logOffset = Math.min(Math.max(requestedOffset, logStart), logStart + logBuffer.length);

  return json({
    running: currentRun !== null && currentRun.finishedAt === null,
    lastRun: currentRun,
    logChunk: logBuffer.slice(logOffset - logStart),
    logOffset: logStart + logBuffer.length,
    logTruncated: requestedOffset < logStart,
    results,
  });
};

export const POST: RequestHandler = async ({ request }) => {
  if (!process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN) {
    error(
      500,
      "La variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN n'est pas définie sur cette application ; la synchronisation ne peut pas être lancée d'ici.",
    );
  }

  if (currentRun && currentRun.finishedAt === null) {
    error(409, "Une synchronisation lancée depuis cette page est déjà en cours.");
  }

  const { lastModified: lastModifiedRaw } = await request.json();
  const lastModified = new Date(lastModifiedRaw);
  if (typeof lastModifiedRaw !== "string" || Number.isNaN(lastModified.getTime())) {
    error(400, "Date invalide.");
  }
  if (lastModified > new Date()) {
    error(400, "La date ne peut pas être dans le futur.");
  }
  if (lastModified < INCEPTION_DATE) {
    error(400, "La date ne peut pas être antérieure au 1er janvier 2024.");
  }

  const run: SyncRun = {
    startedAt: new Date(),
    lastModified,
    finishedAt: null,
    exitCode: null,
  };
  currentRun = run;
  logBuffer = "";
  logStart = 0;

  // Same command as the Scalingo cron (cron.json); pnpm resolves the workspace
  // by walking up from cwd, which works from the repo root in production and
  // from apps/admin in dev.
  const child = spawn(
    "corepack",
    [
      "pnpm",
      "--filter",
      "@pitchou/worker",
      "exec",
      "tsx",
      "sync-demarche-numerique.ts",
      "--IdSchemaDS",
      "derogation-especes-protegees",
      "--lastModified",
      lastModified.toISOString(),
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  // Mirror to this process's stdout/stderr so the logs also reach Scalingo.
  child.stdout.on("data", (chunk: Buffer) => {
    process.stdout.write(chunk);
    appendLog(chunk.toString());
  });
  child.stderr.on("data", (chunk: Buffer) => {
    process.stderr.write(chunk);
    appendLog(chunk.toString());
  });

  child.on("error", (spawnError) => {
    run.finishedAt = new Date();
    run.exitCode = -1;
    appendLog(`${String(spawnError)}\n`);
  });

  child.on("exit", (code) => {
    run.finishedAt = new Date();
    run.exitCode = code;
  });

  return json({ started: true }, { status: 202 });
};
