import type { Knex } from "knex";

import findCandidateFichiersToDownload from "@pitchou/common/trouverCandidatsFichiersATelecharger.ts";
import { directDatabaseConnection } from "../database.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";

import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444, DSFile } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

type ChampFormulaire = keyof DossierDemarcheNumerique88444;

export async function synchroniserFichiersPiecesJointesPetitionnaireDepuisDS88444(
  fichiersPiecesJointesPetitionnaireParNumeroDossier: Map<Dossier["id"], FileId[]>,
  dossiersDS: DossierDS88444[],
  dossierIdByDS_number: Map<DossierDS88444["number"], Dossier["id"]>,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
  champsAvecPiecesJointes: ChampFormulaire[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  let descriptionsFichiers: Map<DossierDS88444["number"], DSFile[]>[] = [];

  for (const champ of champsAvecPiecesJointes) {
    const champId: ChampDescriptor["id"] | undefined = pitchouKeyToChampDS.get(champ);
    if (!champId) {
      throw new Error(`champId for ${champ} is undefined`);
    }
    const candidate = findCandidateFichiersToDownload(dossiersDS, champId);

    descriptionsFichiers.push(candidate);
  }

  // @ts-ignore
  const dossierIds: Set<DossierId> = new Set(
    dossiersDS.map(({ number }) => dossierIdByDS_number.get(number)),
  );

  const allDsFiles = descriptionsFichiers
    .flatMap((descriptionFichier) => [...descriptionFichier.values()])
    .flat();

  const checksumsDS = new Set(allDsFiles.map((dsfile) => dsfile.checksum));

  //console.log('dossierIds', dossierIds)
  //console.log('checksumsDS', checksumsDS)

  // Find the (dossier, fichier) pairs to unlink: files linked to a dossier of the batch via the pétitionnaire PJ join,
  // but whose DS_checksum is no longer in the list of DS candidates for these dossiers
  const aretesASupprimer = await databaseConnection(
    "arête_dossier__fichier_pièces_jointes_pétitionnaire as a",
  )
    .select(["a.dossier as dossier", "a.fichier as fichier"])
    .innerJoin("file as f", "f.id", "a.fichier")
    .whereIn("a.dossier", [...dossierIds])
    .andWhere("f.DS_checksum", "not in", [...checksumsDS]);

  let fichiersOrphelinsNettoyes: Promise<any> = Promise.resolve();

  if (aretesASupprimer.length >= 1) {
    const fichierIdsCandidatsASupprimer = [...new Set(aretesASupprimer.map((a) => a.fichier))];

    fichiersOrphelinsNettoyes = (async () => {
      // 1. Unlink: delete the concerned pétitionnaire PJ edges (the file may still be used elsewhere)
      await databaseConnection("arête_dossier__fichier_pièces_jointes_pétitionnaire")
        .delete()
        .whereIn(
          ["dossier", "fichier"],
          aretesASupprimer.map((a) => [a.dossier, a.fichier]),
        );

      // 2. Delete the files now that the edges are gone, only
      //    if they are no longer referenced elsewhere
      await deleteFichiersWithoutOtherReferences(
        fichierIdsCandidatsASupprimer,
        databaseConnection,
      );
    })();
  }

  const aretesFichierDossierPiecesJointePetitionnaires = [
    ...fichiersPiecesJointesPetitionnaireParNumeroDossier,
  ]
    .map(([dossierId, fichierIds]) =>
      fichierIds.map((fichierId) => ({ fichier: fichierId, dossier: dossierId })),
    )
    .flat();

  let nouveauxFichiersSynchronises: Promise<any> = Promise.resolve();

  if (aretesFichierDossierPiecesJointePetitionnaires.length >= 1) {
    nouveauxFichiersSynchronises = databaseConnection(
      "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    )
      .insert(aretesFichierDossierPiecesJointePetitionnaires)
      .onConflict(["dossier", "fichier"])
      .ignore();
  }

  return Promise.all([fichiersOrphelinsNettoyes, nouveauxFichiersSynchronises]);
}
