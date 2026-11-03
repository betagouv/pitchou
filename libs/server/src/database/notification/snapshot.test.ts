import { beforeEach, expect, test, vi } from "vitest";
import { getDossierReviewSnapshot } from "./snapshot.ts";
import { getDossierFull } from "../dossier/full.ts";
import { dossiersAccessibleToUser } from "../dossier/access.ts";
import { getNotificationsForUser } from "../notification.ts";
import type { Knex } from "knex";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossierNotification } from "@pitchou/types/notification.ts";
vi.mock("../dossier/full.ts", () => ({ getDossierFull: vi.fn() }));
vi.mock("../dossier/access.ts", () => ({ dossiersAccessibleToUser: vi.fn() }));
vi.mock("../notification.ts", () => ({ getNotificationsForUser: vi.fn() }));
const id = 1 as DossierFull["id"];
const cap = 1 as UserId;
const dossier = {
  id,
  description: "Ancien",
  avisExpert: [],
  decisionsAdministratives: [],
} as unknown as DossierFull;
const notification = { dossier: id, changes: [] } as unknown as DossierNotification;
beforeEach(() => {
  vi.mocked(dossiersAccessibleToUser).mockResolvedValue(new Map([[id, "complet"]]));
  vi.mocked(getDossierFull).mockResolvedValue(dossier);
  vi.mocked(getNotificationsForUser).mockReset().mockResolvedValue([notification]);
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
  expect(getNotificationsForUser).toHaveBeenCalledWith(cap, trx, id);
  expect(result).toMatchObject({
    description: "Ancien",
    notificationSnapshot: notification,
    access: "complet",
  });
});

test("preview never reads or exposes personal review state", async () => {
  const db = {
    transaction: async (run: (trx: Knex.Transaction) => Promise<unknown>) =>
      run({} as Knex.Transaction),
  } as unknown as Knex;
  const result = await getDossierReviewSnapshot(id, cap, true, db);
  expect(getNotificationsForUser).not.toHaveBeenCalled();
  expect(result?.notificationSnapshot).toBeUndefined();
});

test.each([false, true])(
  "restricted followers receive only their personal applicant snapshot, preview=%s",
  async (preview) => {
    vi.mocked(dossiersAccessibleToUser).mockResolvedValue(new Map([[id, "lecture"]]));
    vi.mocked(getDossierFull).mockResolvedValue({
      ...dossier,
      free_comment: "Internal note",
      otherAttachments: [],
    });
    const db = {
      transaction: async (run: (trx: Knex.Transaction) => Promise<unknown>) =>
        run({} as Knex.Transaction),
    } as unknown as Knex;
    const result = await getDossierReviewSnapshot(id, cap, preview, db);
    expect(result).toMatchObject({
      access: "lecture",
      free_comment: "",
      notificationSnapshot: notification,
    });
    vi.mocked(getNotificationsForUser).mockResolvedValue([]);
    expect(
      (await getDossierReviewSnapshot(id, cap, preview, db))?.notificationSnapshot,
    ).toBeUndefined();
  },
);

test("a supplied transaction cannot silently weaken snapshot isolation", async () => {
  await expect(
    getDossierReviewSnapshot(id, cap, false, { isTransaction: true } as Knex),
  ).rejects.toThrow("repeatable read");
});
