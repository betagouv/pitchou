import { beforeEach, expect, test, vi } from "vitest";
import { error } from "@sveltejs/kit";

const mocks = vi.hoisted(() => ({ access: vi.fn(), save: vi.fn(), trx: {} }));
vi.mock("@pitchou/server/database.ts", () => ({ directDatabaseConnection: {} }));
vi.mock("#lib/server/writeAccess.ts", () => ({ withAdminWriteAccess: mocks.access }));
vi.mock("@pitchou/server/onagre/duplicates.ts", async (original) => ({
  ...(await original<typeof import("@pitchou/server/onagre/duplicates.ts")>()),
  saveDuplicateDecision: mocks.save,
}));
import { actions } from "./+page.server.ts";
import { MappingConflict } from "@pitchou/server/onagre/mappings.ts";

const values = {
  project_id: "123",
  demande_key: "onagre-national:demandes:456",
  review_hash: "a".repeat(64),
  version: "0",
  outcome: "ignore",
  reason: "Confirmed existing coverage.",
};
const event = (patch = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...values, ...patch })) data.set(key, value);
  return {
    locals: { user: { id: 7 } },
    request: new Request("http://admin.test/onagre?/saveDuplicate", { method: "POST", body: data }),
  } as never;
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockImplementation(async (_locals, _permission, callback) =>
    callback(mocks.trx, { id: 7 }),
  );
});

test("saving a duplicate choice uses the manage permission and authenticated transaction", async () => {
  const result = await actions.saveDuplicate(event());
  expect(mocks.access.mock.calls[0][1]).toBe("admin:onagre:manage");
  expect(mocks.save).toHaveBeenCalledExactlyOnceWith(mocks.trx, 7, { ...values, version: 0 });
  expect(result).toEqual({ message: "Décision enregistrée. Aucun import lancé." });
});

test("a forbidden write never reaches the decision store", async () => {
  mocks.access.mockImplementation(() => error(403, "Permission insuffisante"));
  await expect(actions.saveDuplicate(event())).rejects.toMatchObject({ status: 403 });
  expect(mocks.save).not.toHaveBeenCalled();
});

test("invalid choices and concurrent edits return explicit form failures", async () => {
  expect(await actions.saveDuplicate(event({ reason: " " }))).toMatchObject({ status: 400 });
  expect(mocks.save).not.toHaveBeenCalled();
  mocks.save.mockRejectedValue(new MappingConflict("Une autre décision a été enregistrée."));
  expect(await actions.saveDuplicate(event())).toMatchObject({
    status: 409,
    data: { message: "Une autre décision a été enregistrée." },
  });
});
