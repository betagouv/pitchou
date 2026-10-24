import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, test, vi } from "vitest";

const startScript = new URL("../../scripts/start.sh", import.meta.url);
async function runStart(app: string, migrationStatus: number) {
  const directory = await mkdtemp(join(tmpdir(), "pitchou-start-"));
  const log = join(directory, "calls");
  try {
    await writeFile(
      join(directory, "pnpm"),
      `#!/bin/sh\nprintf 'migrate\\n' >> "$START_TEST_LOG"\nexit ${migrationStatus}\n`,
      { mode: 0o755 },
    );
    await writeFile(
      join(directory, "corepack"),
      '#!/bin/sh\nprintf "unexpected corepack\\n" >> "$START_TEST_LOG"\nexit 99\n',
      { mode: 0o755 },
    );
    await writeFile(
      join(directory, "node"),
      '#!/bin/sh\nprintf "node %s\\n" "$*" >> "$START_TEST_LOG"\n',
      { mode: 0o755 },
    );
    const result = spawnSync("bash", [startScript.pathname], {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        PITCHOU_APP: app,
        PUBLIC_PITCHOU_ENV: "",
        START_TEST_LOG: log,
      },
      encoding: "utf8",
    });
    return { status: result.status, calls: await readFile(log, "utf8") };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
test("never starts instructeur with a failed schema migration", async () => {
  expect(await runStart("instructeur", 23)).toEqual({ status: 23, calls: "migrate\n" });
});
test("starts instructeur only after migrations succeed", async () => {
  expect(await runStart("instructeur", 0)).toEqual({
    status: 0,
    calls: "migrate\nnode apps/instructeur/build/index.js\n",
  });
});
test("admin startup does not mutate the shared database", async () => {
  expect(await runStart("admin", 23)).toEqual({
    status: 0,
    calls: "node apps/admin/build/index.js\n",
  });
});
test("the duplicated admin scheduler never claims or sends notifications", async () => {
  vi.resetModules();
  vi.stubEnv("PITCHOU_APP", "admin");
  const dispatch = vi.fn();
  const close = vi.fn();
  vi.doMock("@pitchou/server/database.ts", () => ({ closeDatabaseConnection: close }));
  vi.doMock("@pitchou/server/dossierNotificationEmails.ts", () => ({
    dispatchDossierNotificationEmails: dispatch,
  }));
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    await import("./send-dossier-notification-emails.ts");
    expect(dispatch).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(JSON.stringify({ skipped: "admin" }));
  } finally {
    vi.unstubAllEnvs();
    vi.doUnmock("@pitchou/server/database.ts");
    vi.doUnmock("@pitchou/server/dossierNotificationEmails.ts");
    log.mockRestore();
  }
});
