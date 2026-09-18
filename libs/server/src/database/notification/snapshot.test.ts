import { beforeEach, expect, test, vi } from "vitest";
import { getDossierReviewSnapshot } from "./snapshot.ts";
import { getDossierFull } from "../dossier/full.ts";
import { dossiersAccessibleViaCap } from "../dossier/access.ts";
import { getNotificationsForPersonneFromCap } from "../notification.ts";
import type { Knex } from "knex";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";
import type { DossierNotification } from "@pitchou/types/notification.ts";
vi.mock("../dossier/full.ts", () => ({ getDossierFull: vi.fn() }));
vi.mock("../dossier/access.ts", () => ({ dossiersAccessibleViaCap: vi.fn() }));
vi.mock("../notification.ts", () => ({ getNotificationsForPersonneFromCap: vi.fn() }));
const id = 1 as DossierFull["id"];
const cap = "cap" as CapDossierCap;
const dossier = {
  id,
  description: "Ancien",
  avisExpert: [],
  decisionsAdministratives: [],
} as unknown as DossierFull;
const notification = { dossier: id, changes: [] } as unknown as DossierNotification;
beforeEach(() => {
  vi.mocked(dossiersAccessibleViaCap).mockResolvedValue(new Map([[id, "complet"]]));
  vi.mocked(getDossierFull).mockResolvedValue(dossier);
  vi.mocked(getNotificationsForPersonneFromCap).mockReset().mockResolvedValue([notification]);
});

test("values and personal revisions use the same owned repeatable-read transaction", async () => {
  const trx = {} as Knex.Transaction;
  const transaction = vi.fn(async (run: (trx: Knex.Transaction) => Promise<unknown>) => run(trx));
  const result = await getDossierReviewSnapshot(id, cap, false, { transaction } as unknown as Knex);
  expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "repeatable read",
    readOnly: true,
  });
  expect(getDossierFull).toHaveBeenCalledWith(id, cap, trx);
  expect(getNotificationsForPersonneFromCap).toHaveBeenCalledWith(cap, trx, id);
  expect(result).toMatchObject({
    description: "Ancien",
    notificationSnapshot: notification,
    access: "complet",
  });
});

test.each(["preview", "shared"])(
  "%s never reads or exposes personal review state",
  async (mode) => {
    if (mode === "shared")
      vi.mocked(dossiersAccessibleViaCap).mockResolvedValue(new Map([[id, "lecture"]]));
    const db = {
      transaction: async (run: (trx: Knex.Transaction) => Promise<unknown>) =>
        run({} as Knex.Transaction),
    } as unknown as Knex;
    const result = await getDossierReviewSnapshot(id, cap, mode === "preview", db);
    expect(getNotificationsForPersonneFromCap).not.toHaveBeenCalled();
    expect(result?.notificationSnapshot).toBeUndefined();
  },
);

test("a supplied transaction cannot silently weaken snapshot isolation", async () => {
  await expect(
    getDossierReviewSnapshot(id, cap, false, { isTransaction: true } as Knex),
  ).rejects.toThrow("repeatable read");
});
