import { collectFileChecksums } from "./edge_dossier__fichier_pieces_jointes_petitionnaire/candidates.ts";
import {
  insertFileEdges,
  logRemovedFiles,
} from "./edge_dossier__fichier_pieces_jointes_petitionnaire/edges.ts";
import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";

import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
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
): Promise<Set<DossierId>> {
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) =>
      synchronizeFichiersPiecesJointesPetitionnaireFromDS88444(
        fichiersPiecesJointesPetitionnaireByDossierId,
        dossiersDS,
        dossierIdByDS_number,
        pitchouKeyToChampDS,
        fieldsWithPiecesJointes,
        trx,
      ),
    );
  const { dossierIds, checksumsByDossier } = collectFileChecksums(
    dossiersDS,
    dossierIdByDS_number,
    pitchouKeyToChampDS,
    fieldsWithPiecesJointes,
  );
  //console.log('dossierIds', dossierIds)
  //console.log('checksumsDS', checksumsDS)

  // Compare each dossier with its own files, even when two dossiers share a checksum.
  const existingFileEdges = await databaseConnection(
    "edge_dossier__fichier_pieces_jointes_petitionnaire as a",
  )
    .select([
      "a.dossier as dossier",
      "a.fichier as fichier",
      "f.name",
      "f.demarche_numerique_checksum as checksum",
    ])
    .innerJoin("file as f", "f.id", "a.fichier")
    .whereIn("a.dossier", [...dossierIds]);
  const edgesToDelete = existingFileEdges.filter(
    (edge) => !checksumsByDossier.get(edge.dossier)?.has(edge.checksum),
  );

  if (edgesToDelete.length > 0) {
    await databaseConnection("edge_dossier__fichier_pieces_jointes_petitionnaire")
      .delete()
      .whereIn(
        ["dossier", "fichier"],
        edgesToDelete.map((edge) => [edge.dossier, edge.fichier]),
      );
  }

  const edgesFichierDossierPiecesJointePetitionnaires = [
    ...fichiersPiecesJointesPetitionnaireByDossierId,
  ]
    .map(([dossierId, fichierIds]) =>
      fichierIds.map((fichierId) => ({ fichier: fichierId, dossier: dossierId })),
    )
    .flat();

  const dossiersWithNewPiecesJointes = new Set<DossierId>(
    edgesToDelete.map(({ dossier }) => dossier),
  );
  await logRemovedFiles(edgesToDelete, databaseConnection);

  await insertFileEdges(
    edgesFichierDossierPiecesJointePetitionnaires,
    dossiersWithNewPiecesJointes,
    databaseConnection,
  );

  // A removed file may be linked to another dossier in this same batch.
  // Finish all link mutations before deciding which files are orphaned.
  await deleteFichiersWithoutOtherReferences(
    [...new Set(edgesToDelete.map((edge) => edge.fichier))],
    databaseConnection,
  );
  return dossiersWithNewPiecesJointes;
}
