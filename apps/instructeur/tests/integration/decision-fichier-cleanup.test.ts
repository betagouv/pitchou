import { expect, test } from "vitest";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";
import { updateDecisionAdministrative } from "@pitchou/server/database/decision_administrative.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { fileKey } from "@pitchou/server/objectStorage.ts";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createDossier } from "../factories/dossier.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import { readS3Body, s3HasKey } from "../helpers/fileStorage.ts";

const replacement = {
  name: "replacement.pdf",
  media_type: "application/pdf",
  contenuBase64: Buffer.from("new").toString("base64"),
};

test("preserves the old decision object when the later audit insert fails", async () => {
  const dossier = (await createDossier(db)).id as DossierId;
  const file = await createFichierS3(db, await getTestS3());
  const [decision] = await db("decision_administrative")
    .insert({ dossier, fichier: file.id })
    .returning("id");

  await expect(
    db.transaction(async (trx) => {
      await updateDecisionAdministrative(
        { id: decision.id, dossier, fichier_base64: replacement },
        trx,
      );
      await logDossierActions(
        [{ dossier, type: "decision_modifiee", author_personne: -1 as PersonneId }],
        trx,
      );
    }),
  ).rejects.toThrow(/foreign key/);

  expect(await db("decision_administrative").where({ id: decision.id }).first()).toMatchObject({
    fichier: file.id,
  });
  expect(await db("file").where({ id: file.id })).toHaveLength(1);
  expect(await readS3Body(file.key)).toBe(file.bytes.toString());
  expect(await db("action_dossier").where({ dossier })).toHaveLength(0);
});

test("commits a decision replacement and its audit before deleting the old object", async () => {
  const dossier = (await createDossier(db)).id as DossierId;
  const file = await createFichierS3(db, await getTestS3());
  const [decision] = await db("decision_administrative")
    .insert({ dossier, fichier: file.id })
    .returning("id");
  await db.transaction(async (trx) => {
    await updateDecisionAdministrative(
      { id: decision.id, dossier, fichier_base64: replacement },
      trx,
    );
    await logDossierActions([{ dossier, type: "decision_modifiee" }], trx);
    expect(await s3HasKey(file.key)).toBe(true);
  });
  await expect.poll(() => s3HasKey(file.key)).toBe(false);
  const updated = await db("decision_administrative").where({ id: decision.id }).first();
  expect(await readS3Body(fileKey(updated.fichier))).toBe("new");
  expect(await db("action_dossier").where({ dossier })).toHaveLength(1);
  expect(await db("file").where({ id: file.id })).toHaveLength(0);
});
