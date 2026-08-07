import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { deleteFichiersWithoutOtherReferences } from "../fichier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import { DossierNotCreatedInPitchouError } from "./errors.ts";
import { getDossierSyncStatus } from "./policy.ts";
import { deleteUnreferencedDossierPersonnes } from "./relations.ts";

async function collectFileIds(dossierId: DossierId, trx: Knex.Transaction): Promise<FileId[]> {
  const [dossier, pieces, decisions, avis, attachments] = await Promise.all([
    trx("dossier").select("especes_impactees").where({ id: dossierId }).first(),
    trx("edge_dossier__fichier_pieces_jointes_petitionnaire")
      .select("fichier")
      .where({ dossier: dossierId }),
    trx("decision_administrative").select("fichier").where({ dossier: dossierId }),
    trx("avis_expert").select(["saisine_fichier", "avis_fichier"]).where({ dossier: dossierId }),
    trx("other_attachment").select("fichier").where({ dossier: dossierId }),
  ]);
  const ids = [
    dossier?.especes_impactees,
    ...pieces.map(({ fichier }) => fichier),
    ...decisions.map(({ fichier }) => fichier),
    ...avis.flatMap(({ saisine_fichier, avis_fichier }) => [saisine_fichier, avis_fichier]),
    ...attachments.map(({ fichier }) => fichier),
  ];
  return [...new Set(ids.filter((id): id is FileId => Boolean(id)))];
}

export async function deleteDossierFromAdmin(
  dossierId: DossierId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  await databaseConnection.transaction(async (trx) => {
    if (!(await getDossierSyncStatus(dossierId, trx)).createdInPitchou) {
      throw new DossierNotCreatedInPitchouError(dossierId);
    }
    const dossier = await trx("dossier")
      .select("demandeur_personne_physique", "deposant")
      .where({ id: dossierId })
      .first();
    const fileIds = await collectFileIds(dossierId, trx);
    await trx("dossier").where({ id: dossierId }).delete();
    if (dossier)
      await deleteUnreferencedDossierPersonnes(
        [dossier.demandeur_personne_physique, dossier.deposant],
        trx,
      );
    await deleteFichiersWithoutOtherReferences(fileIds, trx);
  });
}
