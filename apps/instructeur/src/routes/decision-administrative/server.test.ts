import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: { commit: vi.fn(), rollback: vi.fn(), isCompleted: vi.fn() },
  access: vi.fn(),
  dossierFromDecision: vi.fn(),
  update: vi.fn(),
  add: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@pitchou/server/database.ts", () => ({
  createTransaction: async () => mocks.transaction,
}));
vi.mock("@pitchou/server/database/dossier.ts", () => ({ dossiersAccessibleViaCap: mocks.access }));
vi.mock("@pitchou/server/database/decision_administrative.ts", () => ({
  getDossierIdFromDecisionAdministrative: mocks.dossierFromDecision,
  updateDecisionAdministrative: mocks.update,
  addDecisionAdministrativeWithFichier: mocks.add,
}));
vi.mock("@pitchou/server/database/action_dossier.ts", () => ({ logDossierActions: mocks.audit }));
vi.mock("@pitchou/server/database/personne.ts", () => ({
  getPersonneByDossierCap: async () => ({ id: 7 }),
}));

import { POST } from "./+server.ts";

function updateDecision() {
  return POST({
    url: new URL(
      "http://localhost/decision-administrative?cap=11111111-1111-4111-8111-111111111111",
    ),
    request: new Request("http://localhost/decision-administrative", {
      method: "POST",
      body: JSON.stringify({ id: "decision", dossier: 42, number: "AP-001" }),
    }),
  } as Parameters<typeof POST>[0]);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.access.mockResolvedValue(new Map([[42, "complet"]]));
  mocks.dossierFromDecision.mockResolvedValue(42);
  mocks.update.mockResolvedValue("decision");
  mocks.transaction.isCompleted.mockImplementation(
    () => mocks.transaction.rollback.mock.calls.length > 0,
  );
});

test.each([99, undefined])(
  "rejects a decision outside the submitted dossier: %s",
  async (dossier) => {
    mocks.dossierFromDecision.mockResolvedValue(dossier);
    await expect(updateDecision()).rejects.toMatchObject({ status: 403 });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.add).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.transaction.commit).not.toHaveBeenCalled();
    expect(mocks.transaction.rollback).toHaveBeenCalledOnce();
  },
);

test.each(["lecture", undefined])("rejects writes without ownership: %s", async (access) => {
  mocks.access.mockResolvedValue(new Map([[42, access]]));
  await expect(updateDecision()).rejects.toMatchObject({ status: 400 });
  expect(mocks.dossierFromDecision).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.audit).not.toHaveBeenCalled();
  expect(mocks.transaction.rollback).toHaveBeenCalledOnce();
});

test("updates and audits a decision belonging to the authorized dossier", async () => {
  expect((await updateDecision()).status).toBe(200);
  expect(mocks.dossierFromDecision).toHaveBeenCalledWith("decision", mocks.transaction);
  expect(mocks.update).toHaveBeenCalledWith(
    { id: "decision", dossier: 42, number: "AP-001" },
    mocks.transaction,
  );
  expect(mocks.audit).toHaveBeenCalledOnce();
  expect(mocks.transaction.commit).toHaveBeenCalledOnce();
  expect(mocks.transaction.rollback).not.toHaveBeenCalled();
});
