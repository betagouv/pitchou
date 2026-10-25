import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  preview: vi.fn(),
  apply: vi.fn(),
  read: vi.fn(),
  access: vi.fn(),
  db: {},
  trx: {},
}));
vi.mock("@pitchou/server/database.ts", () => ({ directDatabaseConnection: mocks.db }));
vi.mock("@pitchou/server/onagre/import.ts", async (original) => ({
  ...(await original<typeof import("@pitchou/server/onagre/import.ts")>()),
  createImportPreview: mocks.preview,
  applyImportPreview: mocks.apply,
  readImportRun: mocks.read,
}));
vi.mock("#lib/server/writeAccess.ts", () => ({ withAdminWriteAccess: mocks.access }));
import { OnagreImportError } from "@pitchou/server/onagre/import.ts";
import { GET, POST } from "./+server.ts";

const admin = { id: 7 };
function event(body: unknown, user: unknown = admin) {
  return {
    locals: { user },
    request: new Request("http://admin.test/onagre/imports", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  } as never;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockImplementation(async (_locals, _permission, callback) =>
    callback(mocks.trx, { id: 7 }),
  );
});

test("preview uses the reader path and binds the authenticated actor", async () => {
  const request = { action: "preview", snapshotId: 1, recordIds: ["123"] };
  mocks.preview.mockResolvedValue({ previewId: "test", availability: { enabled: false } });
  const response = await POST(event(request));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(mocks.preview).toHaveBeenCalledExactlyOnceWith(mocks.db, request, 7);
  expect(mocks.access).not.toHaveBeenCalled();
  expect(mocks.apply).not.toHaveBeenCalled();
});

test("apply requires the manage permission and uses its transaction", async () => {
  const request = { action: "apply", previewId: "test", recordIds: ["123"] };
  mocks.apply.mockResolvedValue({ runId: "run" });
  await POST(event(request));
  expect(mocks.access.mock.calls[0][1]).toBe("admin:onagre:manage");
  expect(mocks.apply).toHaveBeenCalledExactlyOnceWith(mocks.trx, 7, request);
  mocks.access.mockRejectedValue({ status: 403 });
  mocks.apply.mockClear();
  await expect(POST(event(request))).rejects.toMatchObject({ status: 403 });
  expect(mocks.apply).not.toHaveBeenCalled();
});

test("disabled and stale apply errors preserve their HTTP status", async () => {
  for (const status of [403, 409] as const) {
    mocks.apply.mockRejectedValue(new OnagreImportError("Blocked", status));
    await expect(POST(event({ action: "apply" }))).rejects.toMatchObject({ status });
  }
});

test("rejects unauthenticated, malformed and oversized requests before import", async () => {
  await expect(POST(event({}, null))).rejects.toMatchObject({ status: 401 });
  await expect(POST(event({ action: "unknown" }))).rejects.toMatchObject({ status: 400 });
  await expect(POST(event("x".repeat(4097)))).rejects.toMatchObject({ status: 413 });
  const invalid = {
    locals: { user: { id: 7 } },
    request: new Request("http://admin.test", { method: "POST", body: "{" }),
  } as never;
  await expect(POST(invalid)).rejects.toMatchObject({ status: 400 });
  expect(mocks.apply).not.toHaveBeenCalled();
  expect(mocks.preview).not.toHaveBeenCalled();
});

test("report reads the saved run with no cache", async () => {
  mocks.read.mockResolvedValue({ runId: "run" });
  const response = await GET({
    url: new URL("http://admin.test/onagre/imports?runId=run"),
  } as never);
  expect(await response.json()).toEqual({ runId: "run" });
  expect(mocks.read).toHaveBeenCalledExactlyOnceWith(mocks.db, "run");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
