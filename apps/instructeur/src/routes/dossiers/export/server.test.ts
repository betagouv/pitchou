import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ids: vi.fn(), dossiers: vi.fn() }));
vi.mock("@pitchou/server/database/dossier.ts", () => ({ dossiersAccessibleToUser: vi.fn() }));
vi.mock("@pitchou/server/database/dossier/list.ts", () => ({ getDossiersListIds: mocks.ids }));
vi.mock("@pitchou/server/database/dossier/export.ts", () => ({
  getDossiersForExport: mocks.dossiers,
}));
import { POST } from "./+server.ts";

function download(body: unknown, scope = "service", user = true) {
  const url = new URL(`http://localhost/dossiers/export?scope=${scope}&format=csv`);
  return POST({
    url,
    locals: { user: user ? { id: 7 } : undefined },
    request: new Request(url, { method: "POST", body: JSON.stringify(body) }),
  } as Parameters<typeof POST>[0]);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.ids.mockResolvedValue([10, 20, 30]);
  mocks.dossiers.mockResolvedValue([]);
});

test("exports every filtered demande using the authenticated user, independently of the page", async () => {
  const response = await download({ query: "q=Marais&page=5&pageSize=10&localisation=france" });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const [user, params, scope] = mocks.ids.mock.calls[0];
  expect(user).toBe(7);
  expect(scope).toBe("all");
  expect(params.get("q")).toBe("Marais");
  expect(params.get("localisation")).toBe("assigned");
  expect(mocks.dossiers).toHaveBeenCalledWith(7, "service", [10, 20, 30]);
});

test.each([
  ["followed", "followed", "assigned"],
  ["france", "all", "france"],
])("keeps the %s export scope authoritative", async (scope, listScope, localisation) => {
  await download({ query: "localisation=assigned&scope=all" }, scope);
  expect(mocks.ids.mock.calls[0][2]).toBe(listScope);
  expect(mocks.ids.mock.calls[0][1].get("localisation")).toBe(localisation);
  expect(mocks.dossiers).toHaveBeenCalledWith(7, scope, [10, 20, 30]);
});

test("preserves explicit selection exports without running a list query", async () => {
  await download({ dossierIds: [42] });
  expect(mocks.ids).not.toHaveBeenCalled();
  expect(mocks.dossiers).toHaveBeenCalledWith(7, "service", [42]);
});

test.each([
  {},
  { query: null },
  { query: [] },
  { query: "", dossierIds: [] },
  { dossierIds: [-1] },
  { dossierIds: [1.5] },
  { dossierIds: ["42"] },
  { query: "", unexpected: true },
])("rejects malformed or ambiguous export selections: %j", async (body) => {
  await expect(download(body)).rejects.toMatchObject({ status: 400 });
  expect(mocks.ids).not.toHaveBeenCalled();
  expect(mocks.dossiers).not.toHaveBeenCalled();
});

test("requires authentication before selecting export IDs", async () => {
  await expect(download({ query: "" }, "service", false)).rejects.toMatchObject({ status: 401 });
  expect(mocks.ids).not.toHaveBeenCalled();
});
