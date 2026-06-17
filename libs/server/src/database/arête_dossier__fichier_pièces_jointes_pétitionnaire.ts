import type { Knex } from "knex";

import trouverCandidatsFichiersÀTélécharger from "@pitchou/common/trouverCandidatsFichiersÀTélécharger.ts";
import { directDatabaseConnection } from "../database.ts";
import { supprimerFichiersSansAutresRéférences } from "./fichier.ts";

import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444, DSFile } from "@pitchou/types/démarche-numérique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/démarche-numérique/schema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/démarche-numérique/Démarche88444.ts";

type ChampFormulaire = keyof DossierDemarcheNumerique88444;

export async function synchroniserFichiersPiècesJointesPétitionnaireDepuisDS88444(
  fichiersPiècesJointesPétitionnaireParNuméroDossier: Map<Dossier["id"], FileId[]>,
  dossiersDS: DossierDS88444[],
  dossierIdByDS_number: Map<DossierDS88444["number"], Dossier["id"]>,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
  champsAvecPiècesJointes: ChampFormulaire[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any> {
  let descriptionsFichiers: Map<DossierDS88444["number"], DSFile[]>[] = [];

  for (const champ of champsAvecPiècesJointes) {
    const champId: ChampDescriptor["id"] | undefined = pitchouKeyToChampDS.get(champ);
    if (!champId) {
      throw new Error(`champId for ${champ} is undefined`);
    }
    const candidat = trouverCandidatsFichiersÀTélécharger(dossiersDS, champId);

    descriptionsFichiers.push(candidat);
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

  // Trouver les (dossier, fichier) à délier : fichiers liés à un dossier du lot via la jointure PJ pétitionnaire,
  // mais dont le DS_checksum n'est plus dans la liste des candidats DS pour ces dossiers
  const arêtesÀSupprimer = await databaseConnection(
    "arête_dossier__fichier_pièces_jointes_pétitionnaire as a",
  )
    .select(["a.dossier as dossier", "a.fichier as fichier"])
    .innerJoin("file as f", "f.id", "a.fichier")
    .whereIn("a.dossier", [...dossierIds])
    .andWhere("f.DS_checksum", "not in", [...checksumsDS]);

  let fichiersOrphelinsNettoyés: Promise<any> = Promise.resolve();

  if (arêtesÀSupprimer.length >= 1) {
    const fichierIdsCandidatsÀSupprimer = [...new Set(arêtesÀSupprimer.map((a) => a.fichier))];

    fichiersOrphelinsNettoyés = (async () => {
      // 1. Délier : supprimer les arêtes PJ pétitionnaire concernées (le fichier peut encore servir ailleurs)
      await databaseConnection("arête_dossier__fichier_pièces_jointes_pétitionnaire")
        .delete()
        .whereIn(
          ["dossier", "fichier"],
          arêtesÀSupprimer.map((a) => [a.dossier, a.fichier]),
        );

      // 2. Supprimer les fichiers maintenant que les arêtes sont parties, uniquement
      //    s'ils ne sont plus référencés ailleurs
      await supprimerFichiersSansAutresRéférences(
        fichierIdsCandidatsÀSupprimer,
        databaseConnection,
      );
    })();
  }

  const arêtesFichierDossierPiècesJointePétitionnaires = [
    ...fichiersPiècesJointesPétitionnaireParNuméroDossier,
  ]
    .map(([dossierId, fichierIds]) =>
      fichierIds.map((fichierId) => ({ fichier: fichierId, dossier: dossierId })),
    )
    .flat();

  let nouveauxFichiersSynchronisés: Promise<any> = Promise.resolve();

  if (arêtesFichierDossierPiècesJointePétitionnaires.length >= 1) {
    nouveauxFichiersSynchronisés = databaseConnection(
      "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    )
      .insert(arêtesFichierDossierPiècesJointePétitionnaires)
      .onConflict(["dossier", "fichier"])
      .ignore();
  }

  return Promise.all([fichiersOrphelinsNettoyés, nouveauxFichiersSynchronisés]);
}
