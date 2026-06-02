import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { E2E_DB_NAME, databaseUrl, makeAdminKnex, makeKnex } from "./db.ts";

export const E2E_PORT = 32648;
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

let kitProcess: ChildProcess | undefined;

async function dropAndCreateDb(dbName: string): Promise<void> {
  const admin = makeAdminKnex();
  try {
    await admin.raw(
      `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
        WHERE datname = ? AND pid <> pg_backend_pid()`,
      [dbName],
    );
    await admin.raw(`DROP DATABASE IF EXISTS ??`, [dbName]);
    await admin.raw(`CREATE DATABASE ??`, [dbName]);
  } finally {
    await admin.destroy();
  }
}

async function runMigrations(dbName: string): Promise<void> {
  process.env.DATABASE_URL = databaseUrl(dbName);
  const knexfile = (await import(path.join(repoRoot, "knexfile.ts"))).default;
  const db = makeKnex(dbName);
  try {
    await db.migrate.latest(knexfile.production.migrations);
  } finally {
    await db.destroy();
  }
}

async function waitForKitReady(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.status < 500) return;
    } catch (e) {
      lastError = e;
    }
    await sleep(250);
  }
  throw new Error(`Kit server did not start in ${timeoutMs}ms: ${String(lastError)}`);
}

async function spawnKit(dbName: string, port: number): Promise<ChildProcess> {
  const child = spawn("node", ["build/index.js"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      ORIGIN: `http://127.0.0.1:${port}`,
      DATABASE_URL: databaseUrl(dbName),
      NODE_ENV: "production",
      DEMARCHE_SIMPLIFIEE_API_TOKEN: process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN ?? "test",
      BREVO_API_KEY: process.env.BREVO_API_KEY ?? "test",
      KEY_CHIFFREMENT_DONNEES_INSTRUCTIONS_DOSSIER:
        process.env.KEY_CHIFFREMENT_DONNEES_INSTRUCTIONS_DOSSIER ??
        "testtesttesttesttesttesttesttesttesttest",
      SITE_URL_PITCHOU: `http://127.0.0.1:${port}`,
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`Kit server (e2e) exited with code ${code} (signal ${signal})`);
    }
  });
  return child;
}

export default async function globalSetup() {
  await dropAndCreateDb(E2E_DB_NAME);
  await runMigrations(E2E_DB_NAME);
  kitProcess = await spawnKit(E2E_DB_NAME, E2E_PORT);
  await waitForKitReady(E2E_BASE_URL);

  return async () => {
    if (kitProcess && kitProcess.exitCode === null) {
      kitProcess.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        if (!kitProcess) return resolve();
        kitProcess.once("exit", () => resolve());
        setTimeout(() => {
          kitProcess?.kill("SIGKILL");
          resolve();
        }, 3000);
      });
    }
    const admin = makeAdminKnex();
    try {
      await admin.raw(
        `SELECT pg_terminate_backend(pid)
           FROM pg_stat_activity
          WHERE datname = ? AND pid <> pg_backend_pid()`,
        [E2E_DB_NAME],
      );
      await admin.raw(`DROP DATABASE IF EXISTS ??`, [E2E_DB_NAME]);
    } finally {
      await admin.destroy();
    }
  };
}
