import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { getEspecesProtegees, replaceEspecesProtegees } from "$lib/server/especeProtegee.ts";
import type { EspeceProtegeeInitializer } from "$types/database/public/EspeceProtegee.ts";

// cd_ref is a branded string in the generated type; cast the literals for the test.
function row(cd_ref: string, classification = "oiseau"): EspeceProtegeeInitializer {
  return {
    cd_ref,
    classification,
    noms_scientifiques: [`Espece ${cd_ref}`],
    noms_vernaculaires: [],
    cd_type_statuts: ["PN"],
    espece_ministerielle: false,
    espece_cnpn: false,
  } as unknown as EspeceProtegeeInitializer;
}

test("replaceEspecesProtegees remplace entièrement le contenu de la table", async () => {
  await replaceEspecesProtegees([row("1"), row("2")], db);
  await replaceEspecesProtegees([row("3")], db);

  const rows = await getEspecesProtegees(db);
  expect(rows.map((r) => r.cd_ref)).toEqual(["3"]);
});

test("replaceEspecesProtegees vide la table quand on lui passe une liste vide", async () => {
  await replaceEspecesProtegees([row("1"), row("2")], db);
  await replaceEspecesProtegees([], db);

  expect(await getEspecesProtegees(db)).toEqual([]);
});

test("replaceEspecesProtegees insère au-delà de la taille d'un batch (1000)", async () => {
  const rows = Array.from({ length: 1200 }, (_v, i) => row(String(i + 1)));
  await replaceEspecesProtegees(rows, db);

  const [{ count }] = await db("espece_protegee").count<{ count: string }[]>("* as count");
  expect(Number(count)).toBe(1200);
});

test("replaceEspecesProtegees réutilise la transaction de l'appelant", async () => {
  await replaceEspecesProtegees([row("1")], db);

  // The truncate + insert run inside the caller's transaction, so rolling it
  // back undoes them — proving no separate transaction was committed.
  await expect(
    db.transaction(async (trx) => {
      await replaceEspecesProtegees([row("2")], trx);
      throw new Error("rollback");
    }),
  ).rejects.toThrow("rollback");

  const rows = await getEspecesProtegees(db);
  expect(rows.map((r) => r.cd_ref)).toEqual(["1"]);
});
