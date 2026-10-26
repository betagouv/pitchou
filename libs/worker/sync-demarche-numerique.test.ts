import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  synchronize: vi.fn(),
  transaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  record: vi.fn(),
  dispatch: vi.fn(),
  close: vi.fn(),
}));
vi.mock("@pitchou/server/database.ts", () => ({
  directDatabaseConnection: { transaction: mocks.transaction },
  createTransaction: async () => ({ commit: mocks.commit, rollback: mocks.rollback }),
  addDemarcheNumerique88444SynchronizationResult: mocks.record,
  closeDatabaseConnection: mocks.close,
}));
vi.mock("@pitchou/server/dossierNotificationEmails.ts", () => ({
  dispatchArrivalEmailsAfterCommit: mocks.dispatch,
}));
vi.mock("./synchronization-ds/synchronizeDemarcheNumerique.ts", () => ({
  synchronizeDemarcheNumerique: mocks.synchronize,
}));
const originalArgv = process.argv;
const originalExitCode = process.exitCode;
beforeEach(() => {
  vi.resetModules();
  for (const mock of Object.values(mocks)) mock.mockReset().mockResolvedValue(undefined);
  mocks.transaction.mockImplementation(async (run) => {
    await run({});
    await mocks.commit();
  });
  process.argv = [
    "node",
    "sync-demarche-numerique.ts",
    "--IdSchemaDS",
    "derogation-especes-protegees",
  ];
  process.exitCode = undefined;
  vi.stubEnv("DATABASE_URL", "postgresql://unused");
  vi.stubEnv("DEMARCHE_SIMPLIFIEE_API_TOKEN", "test");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
const run = () => import("./sync-demarche-numerique.ts");

test("the scheduler sees a failed synchronization and connections are closed", async () => {
  mocks.synchronize.mockRejectedValue(new Error("DN unavailable"));
  await run();
  expect(process.exitCode).toBe(1);
  expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  expect(mocks.dispatch).not.toHaveBeenCalled();
  expect(mocks.close).toHaveBeenCalledOnce();
});

test("success and emails wait for commit", async () => {
  mocks.commit.mockImplementation(() => {
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  await run();
  expect(mocks.commit).toHaveBeenCalledOnce();
  expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  expect(mocks.dispatch).toHaveBeenCalledOnce();
  expect(process.exitCode).toBeUndefined();
});

test("a commit failure is a failure, not a successful sync", async () => {
  mocks.commit.mockRejectedValue(new Error("Commit failed"));
  await run();
  expect(process.exitCode).toBe(1);
  expect(mocks.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ success: false }));
  expect(mocks.dispatch).not.toHaveBeenCalled();
});

test("a failure to save status still fails the command and closes connections", async () => {
  mocks.synchronize.mockRejectedValue(new Error("DN unavailable"));
  mocks.record.mockRejectedValue(new Error("Status unavailable"));
  await run();
  expect(process.exitCode).toBe(1);
  expect(mocks.close).toHaveBeenCalledOnce();
});

test("failure to open the transaction is reported and connections are closed", async () => {
  mocks.transaction.mockRejectedValue(new Error("Connection unavailable"));
  await run();
  expect(process.exitCode).toBe(1);
  expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  expect(mocks.synchronize).not.toHaveBeenCalled();
  expect(mocks.close).toHaveBeenCalledOnce();
});

test("a status failure after commit does not falsely report that data rolled back", async () => {
  mocks.record.mockRejectedValue(new Error("Status unavailable"));
  await run();
  expect(process.exitCode).toBe(1);
  expect(mocks.commit).toHaveBeenCalledOnce();
  expect(mocks.record).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ success: true }));
  expect(mocks.close).toHaveBeenCalledOnce();
});

test("saved synchronization errors retain the database cause without the SQL statement", async () => {
  mocks.synchronize.mockRejectedValue(
    new Error(
      `insert into "action_dossier" values ${"($1),".repeat(30_000)} - bind message has 53308 parameter formats but 0 parameters`,
    ),
  );
  await run();
  expect(mocks.record).toHaveBeenCalledWith(
    expect.objectContaining({
      success: false,
      error: "bind message has 53308 parameter formats but 0 parameters",
    }),
  );
});
