import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createDossier } from "../factories/dossier.ts";
import { logActionsDossier } from "@pitchou/server/database/action_dossier.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

function actions(dossier: number, count: number): ActionDossierInitializer[] {
  return Array.from({ length: count }, (_, index) => ({
    dossier: dossier as DossierId,
    type: "champ_modifie",
    author_petitionnaire: true,
    data: { notification_field: "personne_contact.phone", to: String(index) },
  }));
}

test("large history writes persist every entry beyond PostgreSQL's parameter limit", async () => {
  const dossier = await createDossier(db);
  // Four bound columns per row: 17,000 rows exceed the 65,535-parameter limit.
  const count = 17_000;
  await db.transaction((trx) => logActionsDossier(actions(dossier.id, count), trx));
  const saved = await db("action_dossier").select("data", "author_petitionnaire");
  expect(saved).toHaveLength(count);
  expect(saved.every(({ author_petitionnaire }) => author_petitionnaire)).toBe(true);
  expect(new Set(saved.map(({ data }) => data.to)).size).toBe(count);
});

test("a failure in a later history batch rolls back every batch and the caller's changes", async () => {
  const dossier = await createDossier(db);
  const rows = [...actions(dossier.id, 1_200), ...actions(-1, 1)];
  await expect(
    db.transaction(async (trx) => {
      await trx("dossier").where({ id: dossier.id }).update({ name: "Must roll back" });
      await logActionsDossier(rows, trx);
    }),
  ).rejects.toThrow(/foreign key/u);
  expect(await db("action_dossier")).toEqual([]);
  expect((await db("dossier").where({ id: dossier.id }).first()).name).toBe(dossier.name);
});

test("history writes remain atomic without a caller transaction", async () => {
  const dossier = await createDossier(db);
  await expect(
    logActionsDossier([...actions(dossier.id, 1_200), ...actions(-1, 1)], db),
  ).rejects.toThrow(/foreign key/u);
  expect(await db("action_dossier")).toEqual([]);
});
