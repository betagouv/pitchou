import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  change: vi.fn(),
  read: vi.fn(),
  list: vi.fn(),
  export: vi.fn(),
  access: vi.fn(),
  db: {},
  trx: {},
}));
vi.mock("@pitchou/server/database.ts", () => ({ directDatabaseConnection: mocks.db }));
vi.mock("@pitchou/server/onagre/import/jobs.ts", () => ({
  createImportJob: mocks.create,
  changeImportJob: mocks.change,
  readImportJob: mocks.read,
  listImportJobs: mocks.list,
  exportImportJob: mocks.export,
}));
vi.mock("#lib/server/writeAccess.ts", () => ({ withAdminWriteAccess: mocks.access }));
import { OnagreImportError } from "@pitchou/server/onagre/import.ts";
import { GET, POST } from "./+server.ts";
const event = (body: unknown) =>
  ({
    locals: { user: { id: 7 } },
    request: new Request("http://admin.test/onagre/import-jobs", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  }) as never;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockImplementation(async (_locals, _permission, callback) =>
    callback(mocks.trx, { id: 7 }),
  );
});
test("analysis persists a job through the admin reader permission", async () => {
  mocks.create.mockResolvedValue({ id: "job" });
  const response = await POST(event({ action: "analyze", snapshotId: 1 }));
  expect(mocks.access.mock.calls[0][1]).toBe("admin:access");
  expect(mocks.create).toHaveBeenCalledExactlyOnceWith(mocks.trx, 7, 1);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
test.each(["import", "cancel"])(
  "%s requires management permission before changing the job",
  async (action) => {
    mocks.change.mockResolvedValue({ id: "job" });
    await POST(event({ action, jobId: "job" }));
    expect(mocks.access.mock.calls[0][1]).toBe("admin:onagre:manage");
    expect(mocks.change).toHaveBeenCalledExactlyOnceWith(mocks.trx, 7, "job", action);
    mocks.access.mockRejectedValue({ status: 403 });
    mocks.change.mockClear();
    await expect(POST(event({ action, jobId: "job" }))).rejects.toMatchObject({ status: 403 });
    expect(mocks.change).not.toHaveBeenCalled();
  },
);
test("invalid, oversized and conflicting starts preserve HTTP errors", async () => {
  await expect(POST(event({ action: "unknown" }))).rejects.toMatchObject({ status: 400 });
  await expect(POST(event("x".repeat(4097)))).rejects.toMatchObject({ status: 413 });
  mocks.create.mockRejectedValue(new OnagreImportError("Active job", 409));
  await expect(POST(event({ action: "analyze", snapshotId: 1 }))).rejects.toMatchObject({
    status: 409,
  });
});
test("reads persisted progress and streams the full report", async () => {
  mocks.read.mockResolvedValue({ job: { id: "job" }, records: [], page: 1, pages: 1 });
  const response = await GET({
    url: new URL("http://admin.test/onagre/import-jobs?jobId=job&page=2"),
  } as never);
  expect(response.status).toBe(200);
  expect(mocks.read).toHaveBeenCalledExactlyOnceWith(mocks.db, "job", 2);
  mocks.export.mockImplementation(async function* () {
    yield '{"kind":"job"}\n';
    yield '{"kind":"batch"}\n';
  });
  const download = await GET({
    url: new URL("http://admin.test/onagre/import-jobs?jobId=job&download=1"),
  } as never);
  expect(download.headers.get("content-type")).toBe("application/x-ndjson");
  expect(await download.text()).toBe('{"kind":"job"}\n{"kind":"batch"}\n');
});
