import type { Knex } from "knex";

import findCandidateFichiersToDownload from "@pitchou/common/findCandidateFichiersToDownload.ts";
import { directDatabaseConnection } from "../database.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";

import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444, DSFile } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

type FormField = keyof DossierDemarcheNumerique88444;

export async function synchronizeFichiersPiecesJointesPetitionnaireFromDS88444(
  fichiersPiecesJointesPetitionnaireByDossierId: Map<Dossier["id"], FileId[]>,
  dossiersDS: DossierDS88444[],
  dossierIdByDS_number: Map<DossierDS88444["number"], Dossier["id"]>,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
  fieldsWithPiecesJointes: FormField[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  let fichierDescriptions: Map<DossierDS88444["number"], DSFile[]>[] = [];

  for (const field of fieldsWithPiecesJointes) {
    const fieldId: ChampDescriptor["id"] | undefined = pitchouKeyToChampDS.get(field);
    if (!fieldId) {
      throw new Error(`fieldId for ${field} is undefined`);
    }
    const candidate = findCandidateFichiersToDownload(dossiersDS, fieldId);

    fichierDescriptions.push(candidate);
  }

  // @ts-ignore
  const dossierIds: Set<DossierId> = new Set(
    dossiersDS.map(({ number }) => dossierIdByDS_number.get(number)),
  );

  const allDsFiles = fichierDescriptions
    .flatMap((fichierDescription) => [...fichierDescription.values()])
    .flat();

  const checksumsDS = new Set(allDsFiles.map((dsfile) => dsfile.checksum));

  //console.log('dossierIds', dossierIds)
  //console.log('checksumsDS', checksumsDS)

  // Find the (dossier, fichier) pairs to unlink: files linked to a dossier of the batch via the pétitionnaire PJ join,
  // but whose DS_checksum is no longer in the list of DS candidates for these dossiers
  const aretesToDelete = await databaseConnection(
    "arête_dossier__fichier_pièces_jointes_pétitionnaire as a",
  )
    .select(["a.dossier as dossier", "a.fichier as fichier"])
    .innerJoin("file as f", "f.id", "a.fichier")
    .whereIn("a.dossier", [...dossierIds])
    .andWhere("f.DS_checksum", "not in", [...checksumsDS]);

  let orphanFichiersCleanedUp: Promise<any> = Promise.resolve();

  if (aretesToDelete.length >= 1) {
    const candidateFichierIdsToDelete = [...new Set(aretesToDelete.map((a) => a.fichier))];

    orphanFichiersCleanedUp = (async () => {
      // 1. Unlink: delete the concerned pétitionnaire PJ edges (the file may still be used elsewhere)
      await databaseConnection("arête_dossier__fichier_pièces_jointes_pétitionnaire")
        .delete()
        .whereIn(
          ["dossier", "fichier"],
          aretesToDelete.map((a) => [a.dossier, a.fichier]),
        );

      // 2. Delete the files now that the edges are gone, only
      //    if they are no longer referenced elsewhere
      await deleteFichiersWithoutOtherReferences(candidateFichierIdsToDelete, databaseConnection);
    })();
  }

  const aretesFichierDossierPiecesJointePetitionnaires = [
    ...fichiersPiecesJointesPetitionnaireByDossierId,
  ]
    .map(([dossierId, fichierIds]) =>
      fichierIds.map((fichierId) => ({ fichier: fichierId, dossier: dossierId })),
    )
    .flat();

  let newFichiersSynchronized: Promise<any> = Promise.resolve();

  if (aretesFichierDossierPiecesJointePetitionnaires.length >= 1) {
    newFichiersSynchronized = databaseConnection(
      "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    )
      .insert(aretesFichierDossierPiecesJointePetitionnaires)
      .onConflict(["dossier", "fichier"])
      .ignore();
  }

  return Promise.all([orphanFichiersCleanedUp, newFichiersSynchronized]);
}
