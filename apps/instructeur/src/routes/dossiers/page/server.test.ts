import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ page: vi.fn(), options: vi.fn() }));
vi.mock("@pitchou/server/database/dossier.ts", () => ({ dossiersAccessibleToUser: vi.fn() }));
vi.mock("@pitchou/server/database/dossier/list.ts", () => ({
  getDossiersListPage: mocks.page,
  getDossiersListOptions: mocks.options,
}));
import { GET as page } from "./+server.ts";
import { GET as options } from "../options/+server.ts";

function load(handler: typeof page | typeof options, search = "", user = true) {
  const url = new URL(`http://localhost/dossiers/page?${search}`);
  return handler({
    url,
    request: new Request(url),
    locals: { user: user ? { id: 7 } : undefined },
  } as Parameters<typeof page>[0] & Parameters<typeof options>[0]);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.page.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
  mocks.options.mockResolvedValue({ activites: [], assignedDepartments: [], instructeurs: [] });
});

test("passes filters and scope to the authenticated page query with private caching", async () => {
  const response = await load(page, "scope=followed&q=Marais&page=3");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({ total: 0, items: [] });
  const [user, params, scope] = mocks.page.mock.calls[0];
  expect(user).toBe(7);
  expect(scope).toBe("followed");
  expect(params.get("q")).toBe("Marais");
  expect(params.get("page")).toBe("3");
});

test("options cover the authenticated scope independently of the visible page", async () => {
  const response = await load(options, "scope=followed&q=Marais&page=9");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.options).toHaveBeenCalledWith(7, "followed");
});

test.each([page, options])("rejects invalid scope or unauthenticated requests", async (handler) => {
  await expect(load(handler, "scope=unknown")).rejects.toMatchObject({ status: 400 });
  await expect(load(handler, "", false)).rejects.toMatchObject({ status: 401 });
  expect(mocks.page).not.toHaveBeenCalled();
  expect(mocks.options).not.toHaveBeenCalled();
});
