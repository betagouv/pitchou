import { synchronizeFichiersPiecesJointesPetitionnaireFromDS88444 } from "@pitchou/server/database/edge_dossier__fichier_pieces_jointes_petitionnaire.ts";
import { synchronizeFichiersEspecesImpacteesFromDS88444 } from "@pitchou/server/database/especes_impactees.ts";
import type { ChampFormulaire88444 } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { Knex } from "knex";
import {
  getFichiersEspecesImpactees88444,
  getPiecesJointesPetitionnaire88444,
} from "./synchronization-dossier-88444.ts";

const champsWithPiecesJointes88444: ChampFormulaire88444[] = [
  "Dépot du dossier complet de demande de dérogation",
  "Si nécessaire, vous pouvez déposer ici des pièces jointes complétant votre demande",
  "Diagnostic écologique",
  "Déposez ici l'argumentaire précis vous ayant permis de conclure à l'absence de risque suffisament caractérisé pour les espèces protégées et leurs habitats.",
  "Joindre les pièces justifiant de la finalité de la demande",
  "Joindre le bilan des opérations antérieures",
  "Ajoutez un fichier décrivant ces mesures complémentaires :",
  "Plan des installations",
  `Joindre une carte du périmètre d'intervention si besoin`,
  "Pièces jointes décrivant précisément le protocole qui sera mis en place",
];

export function startDossierFileDownloads(
  dossiersDS: DossierDS88444[],
  demarcheNumber: number,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
  transaction: Knex.Transaction,
) {
  if (demarcheNumber !== 88444) {
    throw new Error(
      `Les fonctions pour récupérer les fichiers n'ont pas été trouvées pour la Démarche numéro ${demarcheNumber}.`,
    );
  }
  return {
    especesImpactees: getFichiersEspecesImpactees88444(
      dossiersDS,
      pitchouKeyToChampDS,
      transaction,
    ),
    piecesJointesPetitionnaire: getPiecesJointesPetitionnaire88444(
      dossiersDS,
      pitchouKeyToChampDS,
      champsWithPiecesJointes88444,
      transaction,
    ),
  };
}

export function synchronizeDownloadedDossierFiles(
  downloads: ReturnType<typeof startDossierFileDownloads>,
  dossiersDS: DossierDS88444[],
  dossierIdByDNNumber: Map<DossierDS88444["number"], Dossier["id"]>,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
  transaction: Knex.Transaction,
) {
  const especesImpactees = downloads.especesImpactees.then((downloadedFiles) => {
    if (downloadedFiles && downloadedFiles.size >= 1) {
      return synchronizeFichiersEspecesImpacteesFromDS88444(
        downloadedFiles,
        dossierIdByDNNumber,
        transaction,
      );
    }
  });
  const piecesJointesPetitionnaire = downloads.piecesJointesPetitionnaire.then(
    (downloadedFiles) => {
      const filesByDossierId = new Map(
        [...downloadedFiles].map(([number, files]) => {
          const id = dossierIdByDNNumber.get(number);
          if (!id) {
            console.log("dossierIdByDNNumber", dossierIdByDNNumber);
            throw `Id de dossier manquant pour dossier DS ${number}`;
          }
          return [id, files] as const;
        }),
      );
      return synchronizeFichiersPiecesJointesPetitionnaireFromDS88444(
        filesByDossierId,
        dossiersDS,
        dossierIdByDNNumber,
        pitchouKeyToChampDS,
        champsWithPiecesJointes88444,
        transaction,
      );
    },
  );
  return [especesImpactees, piecesJointesPetitionnaire];
}
