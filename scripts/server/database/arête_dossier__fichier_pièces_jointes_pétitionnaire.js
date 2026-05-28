/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {default as Dossier, DossierId} from '../../../scripts/types/database/public/Dossier.ts' */
/** @import {DossierDS88444, DSFile} from '../../types/démarche-numérique/apiSchema.ts' */
/** @import {ChampDescriptor} from '../../types/démarche-numérique/schema.ts' */
/** @import {DossierDemarcheNumerique88444} from '../../types/démarche-numérique/Démarche88444.ts' */
/** @import {Knex} from 'knex' */

import trouverCandidatsFichiersÀTélécharger from "../../../outils/synchronisation-ds/trouverCandidatsFichiersÀTélécharger.js";
import { directDatabaseConnection } from "../database.js";
import { supprimerFichiersSansAutresRéférences } from "./fichier.js";

/** @typedef {keyof DossierDemarcheNumerique88444} ChampFormulaire */

/**
 *
 * @param {Map<Dossier['id'], Fichier['id'][]>} fichiersPiècesJointesPétitionnaireParNuméroDossier
 * @param {DossierDS88444[]} dossiersDS
 * @param {Map<DossierDS88444['number'], Dossier['id']>} dossierIdByDS_number
 * @param {Map<keyof DossierDemarcheNumerique88444, ChampDescriptor['id']>} pitchouKeyToChampDS
 * @param {ChampFormulaire[]} champsAvecPiècesJointes
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function synchroniserFichiersPiècesJointesPétitionnaireDepuisDS88444(
  fichiersPiècesJointesPétitionnaireParNuméroDossier,
  dossiersDS,
  dossierIdByDS_number,
  pitchouKeyToChampDS,
  champsAvecPiècesJointes,
  databaseConnection = directDatabaseConnection,
) {
  /** @type {Map<DossierDS88444['number'], DSFile[]>[]} */
  let descriptionsFichiers = [];

  for (const champ of champsAvecPiècesJointes) {
    /** @type {ChampDescriptor['id'] | undefined} */
    const champId = pitchouKeyToChampDS.get(champ);
    if (!champId) {
      throw new Error(`champId for ${champ} is undefined`);
    }
    const candidat = trouverCandidatsFichiersÀTélécharger(dossiersDS, champId);

    descriptionsFichiers.push(candidat);
  }

  /** @type {Set<DossierId>} */
  // @ts-ignore
  const dossierIds = new Set(dossiersDS.map(({ number }) => dossierIdByDS_number.get(number)));

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
    .innerJoin("fichier as f", "f.id", "a.fichier")
    .whereIn("a.dossier", [...dossierIds])
    .andWhere("f.DS_checksum", "not in", [...checksumsDS]);

  /** @type {Promise<any>} */
  let fichiersOrphelinsNettoyés = Promise.resolve();

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

  /** @type {Promise<any>} */
  let nouveauxFichiersSynchronisés = Promise.resolve();

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
