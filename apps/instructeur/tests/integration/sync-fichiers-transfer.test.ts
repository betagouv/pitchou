import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import { synchronizeFichiersPiecesJointesPetitionnaireFromDS88444 as synchronize } from "@pitchou/server/database/edge_dossier__fichier_pieces_jointes_petitionnaire.ts";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createDossier } from "../factories/dossier.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import { s3HasKey } from "../helpers/fileStorage.ts";

test("keeps a deduplicated file transferred from dossier A to B in one sync batch", async () => {
  const a = (await createDossier(db)).id as DossierId;
  const b = (await createDossier(db)).id as DossierId;
  const file = await createFichierS3(db, await getTestS3());
  const checksum = randomUUID();
  await db("file").where({ id: file.id }).update({ demarche_numerique_checksum: checksum });
  await db("edge_dossier__fichier_pieces_jointes_petitionnaire").insert({
    dossier: a,
    fichier: file.id,
  });
  const candidates = new Map([[b, [file.id]]]);
  const descriptions = [
    { number: 1, champs: [{ id: "pj", label: "PJ", files: [] }], annotations: [] },
    {
      number: 2,
      champs: [{ id: "pj", label: "PJ", files: [{ checksum }] }],
      annotations: [],
    },
  ] as unknown as DossierDS88444[];
  const field = "Joindre les pièces justifiant de la finalité de la demande";
  const sync = () =>
    synchronize(
      candidates,
      descriptions,
      new Map([
        [1, a],
        [2, b],
      ]),
      new Map([[field, "pj"]]),
      [field],
      db,
    );

  expect(await sync()).toEqual(new Set([a, b]));
  expect(await db("file").where({ id: file.id })).toHaveLength(1);
  expect(
    await db("edge_dossier__fichier_pieces_jointes_petitionnaire")
      .select("dossier", "fichier")
      .where({ fichier: file.id }),
  ).toEqual([{ dossier: b, fichier: file.id }]);
  expect(await s3HasKey(file.key)).toBe(true);
  const actions = await db("action_dossier").whereIn("dossier", [a, b]);
  expect(actions.map(({ dossier, type }) => ({ dossier, type }))).toEqual(
    expect.arrayContaining([
      { dossier: a, type: "champ_modifie" },
      { dossier: b, type: "piece_jointe_importee" },
    ]),
  );
  expect(actions).toHaveLength(2);
  expect(await sync()).toEqual(new Set());
  expect(await db("action_dossier").whereIn("dossier", [a, b])).toHaveLength(2);
});
