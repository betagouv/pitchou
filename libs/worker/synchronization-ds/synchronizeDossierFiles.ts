import {
  prepareImpactEspeceFile,
  type PreparedImpactFile,
} from "@pitchou/server/database/impact_espece/prepareImpactEspeceFile.ts";
import { synchronizeFichiersPiecesJointesPetitionnaireFromDS88444 } from "@pitchou/server/database/edge_dossier__fichier_pieces_jointes_petitionnaire.ts";
import { synchronizeFichiersEspecesImpacteesFromDS88444 } from "@pitchou/server/database/especes_impactees.ts";
import { deleteFichiersWithoutOtherReferences } from "@pitchou/server/database/fichier.ts";
import type { ChampFormulaire88444 } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { Knex } from "knex";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import { isChampDSPieceJustificative } from "@pitchou/common/typeguards.ts";
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

export async function startDossierFileDownloads(
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
  const especesImpactees = await getFichiersEspecesImpactees88444(
    dossiersDS,
    pitchouKeyToChampDS,
    transaction,
  );
  const piecesJointesPetitionnaire = await getPiecesJointesPetitionnaire88444(
    dossiersDS,
    pitchouKeyToChampDS,
    champsWithPiecesJointes88444,
    transaction,
  );
  return { especesImpactees, piecesJointesPetitionnaire };
}

export async function prepareDossierFiles(
  downloads: Awaited<ReturnType<typeof startDossierFileDownloads>>,
  transaction: Knex.Transaction,
) {
  const { especesImpactees, piecesJointesPetitionnaire } = downloads;
  const preparedFiles = new Map<FileId, PreparedImpactFile>();
  const candidates = [...(especesImpactees ?? [])];
  const imported: { demarche_numerique_number: string; source_file: FileId }[] =
    candidates.length > 0
      ? await transaction("impact_espece as i")
          .join("dossier as d", "d.id", "i.dossier")
          .where("d.source", "demarche_numerique")
          .whereIn(
            "d.demarche_numerique_number",
            candidates.map(([number]) => number),
          )
          .whereIn(
            "i.source_file",
            candidates.map(([, fileId]) => fileId),
          )
          .distinct("d.demarche_numerique_number", "i.source_file")
      : [];
  const importedPairs = new Set(
    imported.map((row) => `${row.demarche_numerique_number}:${row.source_file}`),
  );
  const pendingFiles = new Set(
    candidates
      .filter(([number, fileId]) => !importedPairs.has(`${number}:${fileId}`))
      .map(([, fileId]) => fileId),
  );
  for (const fileId of pendingFiles) {
    preparedFiles.set(fileId, await prepareImpactEspeceFile(fileId, transaction));
  }
  return { especesImpactees, piecesJointesPetitionnaire, preparedFiles };
}

export async function synchronizeDownloadedDossierFiles(
  downloads: Awaited<ReturnType<typeof prepareDossierFiles>>,
  dossiersDS: DossierDS88444[],
  dossierIdByDNNumber: Map<DossierDS88444["number"], Dossier["id"]>,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
  transaction: Knex.Transaction,
) {
  const files = new Map<number, FileId | null>(downloads.especesImpactees);
  const fieldId = pitchouKeyToChampDS.get(
    "Déposez ici le fichier téléchargé après remplissage sur https://pitchou.beta.gouv.fr/saisie-especes",
  );
  for (const dossier of dossiersDS) {
    const field = dossier.champs.find(({ id }) => id === fieldId);
    if (isChampDSPieceJustificative(field) && field.files.length === 0)
      files.set(dossier.number, null);
  }
  const deferredFileCleanup = new Set<FileId>();
  const especesImpactees =
    files.size > 0
      ? await synchronizeFichiersEspecesImpacteesFromDS88444(
          files,
          dossierIdByDNNumber,
          transaction,
          downloads.preparedFiles,
          deferredFileCleanup,
        )
      : undefined;
  const filesByDossierId = new Map(
    [...downloads.piecesJointesPetitionnaire].map(([number, files]) => {
      const id = dossierIdByDNNumber.get(number);
      if (!id) {
        console.log("dossierIdByDNNumber", dossierIdByDNNumber);
        throw new Error(`Id de dossier manquant pour dossier DS ${number}`);
      }
      return [id, files] as const;
    }),
  );
  const piecesJointesPetitionnaire = await synchronizeFichiersPiecesJointesPetitionnaireFromDS88444(
    filesByDossierId,
    dossiersDS,
    dossierIdByDNNumber,
    pitchouKeyToChampDS,
    champsWithPiecesJointes88444,
    transaction,
  );
  await deleteFichiersWithoutOtherReferences([...deferredFileCleanup], transaction);
  return [especesImpactees, piecesJointesPetitionnaire] as const;
}
