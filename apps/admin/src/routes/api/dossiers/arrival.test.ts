import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  dispatch: vi.fn(),
  commit: vi.fn(),
}));
vi.mock("@pitchou/server/database/dossier_admin.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pitchou/server/database/dossier_admin.ts")>()),
  createDossierFromAdmin: mocks.create,
  updateDossierFromAdminInTransaction: mocks.update,
}));
vi.mock("@pitchou/server/dossierNotificationEmails.ts", () => ({
  dispatchArrivalEmailsAfterCommit: mocks.dispatch,
}));
vi.mock("./dossierCreationUpload.ts", () => ({
  parseDossierCreationUpload: async () => ({ creation: {}, attachments: [] }),
}));
vi.mock("@pitchou/server/database.ts", () => ({
  directDatabaseConnection: {
    transaction: async (callback: (trx: unknown) => Promise<unknown>) => callback({}),
  },
}));
vi.mock("@pitchou/server/database/dossier_admin_list.ts", () => ({
  getDossierDetailForAdmin: async () => ({ id: 42 }),
  listDossiersForAdmin: vi.fn(),
}));
vi.mock("#lib/server/dossierValidation/activiteContext.ts", () => ({
  loadActiviteContext: async () => ({}),
}));
vi.mock("#lib/server/writeAccess.ts", () => ({
  withAdminWriteAccess: async (
    locals: { user: unknown },
    _permission: unknown,
    callback: (trx: unknown, actor: unknown) => Promise<unknown>,
  ) => {
    const result = await callback({}, locals.user);
    mocks.commit();
    return result;
  },
}));
import { POST as createFull } from "./+server.ts";
import { POST as createMinimal } from "./minimal/+server.ts";
import { PUT as update } from "./[dossierId]/+server.ts";

function event(body: unknown = {}) {
  return {
    params: { dossierId: "42" },
    locals: { user: { email: "admin@test.fr" } },
    request: new Request("http://admin.test/api/dossiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  } as never;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.create.mockResolvedValue({ id: 42 });
  mocks.update.mockResolvedValue(undefined);
});
const minimal = {
  name: "Nouveau dossier",
  primary_department: "75",
  porteur_de_projet: { type: "personne_physique", first_names: "Sam", last_name: "Martin" },
};

test.each([
  {
    name: "minimal creation",
    run: () => createMinimal(event(minimal)),
    mutation: mocks.create,
    status: 201,
  },
  { name: "full creation", run: () => createFull(event()), mutation: mocks.create, status: 201 },
  {
    name: "group update",
    run: () => update(event({ columns: { name: "Nouveau nom" } })),
    mutation: mocks.update,
    status: 200,
  },
])("$name dispatches arrivals after the saved mutation", async ({ run, mutation, status }) => {
  expect((await run()).status).toBe(status);
  expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith(42);
  expect(mutation.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.commit.mock.invocationCallOrder[0],
  );
  expect(mocks.commit.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.dispatch.mock.invocationCallOrder[0],
  );
});

test("failed creation never dispatches arrival emails", async () => {
  mocks.create.mockRejectedValue(new Error("failed"));
  await expect(createMinimal(event(minimal))).rejects.toBeDefined();
  expect(mocks.dispatch).not.toHaveBeenCalled();
});
