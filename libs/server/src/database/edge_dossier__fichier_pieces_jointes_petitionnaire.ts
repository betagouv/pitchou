import type { Knex } from "knex";

import findCandidateFichiersToDownload from "@pitchou/common/findCandidateFichiersToDownload.ts";
import { directDatabaseConnection } from "../database.ts";
import { logActionsDossier } from "./action_dossier.ts";
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

  const checksumsByDossier = new Map<DossierId, Set<string>>();
  for (const descriptions of fichierDescriptions) {
    for (const [number, files] of descriptions) {
      const id = dossierIdByDS_number.get(number);
      if (!id) continue;
      const checksums = checksumsByDossier.get(id) ?? new Set<string>();
      for (const file of files) checksums.add(file.checksum);
      checksumsByDossier.set(id, checksums);
    }
  }

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

  let orphanFichiersCleanedUp: Promise<any> = Promise.resolve();

  if (edgesToDelete.length >= 1) {
    const candidateFichierIdsToDelete = [...new Set(edgesToDelete.map((edge) => edge.fichier))];

    orphanFichiersCleanedUp = (async () => {
      // 1. Unlink: delete the concerned pétitionnaire PJ edges (the file may still be used elsewhere)
      await databaseConnection("edge_dossier__fichier_pieces_jointes_petitionnaire")
        .delete()
        .whereIn(
          ["dossier", "fichier"],
          edgesToDelete.map((edge) => [edge.dossier, edge.fichier]),
        );

      // 2. Delete the files now that the edges are gone, only
      //    if they are no longer referenced elsewhere
      await deleteFichiersWithoutOtherReferences(candidateFichierIdsToDelete, databaseConnection);
    })();
  }

  const edgesFichierDossierPiecesJointePetitionnaires = [
    ...fichiersPiecesJointesPetitionnaireByDossierId,
  ]
    .map(([dossierId, fichierIds]) =>
      fichierIds.map((fichierId) => ({ fichier: fichierId, dossier: dossierId })),
    )
    .flat();

  let newFichiersSynchronized: Promise<any> = Promise.resolve();
  const dossiersWithNewPiecesJointes = new Set<DossierId>(
    edgesToDelete.map(({ dossier }) => dossier),
  );
  await logActionsDossier(
    edgesToDelete.map(({ dossier, fichier, name }) => ({
      dossier,
      type: "champ_modifie",
      author_petitionnaire: true,
      data: {
        field: name ?? "Pièce jointe",
        notification_field: `piece:${fichier}`,
        label: name ?? "Pièce jointe supprimée",
        from: name,
        to: null,
        notification: true,
      },
    })),
    databaseConnection,
  );

  if (edgesFichierDossierPiecesJointePetitionnaires.length >= 1) {
    // The insert ignores conflicts, so the historique must only log the edges
    // that do not exist yet — every sync run re-submits the same candidates.
    const existingEdges: { dossier: DossierId; fichier: FileId }[] = await databaseConnection(
      "edge_dossier__fichier_pieces_jointes_petitionnaire",
    )
      .select(["dossier", "fichier"])
      .whereIn(
        ["dossier", "fichier"],
        edgesFichierDossierPiecesJointePetitionnaires.map(({ dossier, fichier }) => [
          dossier,
          fichier,
        ]),
      );
    const existingKeys = new Set(
      existingEdges.map(({ dossier, fichier }) => `${dossier}:${fichier}`),
    );
    const newEdges = edgesFichierDossierPiecesJointePetitionnaires.filter(
      ({ dossier, fichier }) => !existingKeys.has(`${dossier}:${fichier}`),
    );

    newFichiersSynchronized = databaseConnection(
      "edge_dossier__fichier_pieces_jointes_petitionnaire",
    )
      .insert(edgesFichierDossierPiecesJointePetitionnaires)
      .onConflict(["dossier", "fichier"])
      .ignore();

    if (newEdges.length >= 1) {
      const fileNames = new Map<FileId, string | null>(
        (
          await databaseConnection("file")
            .select(["id", "name"])
            .whereIn(
              "id",
              newEdges.map(({ fichier }) => fichier),
            )
        ).map(({ id, name }: { id: FileId; name: string | null }) => [id, name]),
      );
      await logActionsDossier(
        newEdges.map(({ dossier, fichier }) => ({
          dossier,
          type: "piece_jointe_importee",
          data: {
            name: fileNames.get(fichier) ?? null,
            field: fileNames.get(fichier) ?? "Pièce jointe",
            notification_field: `piece:${fichier}`,
            label: fileNames.get(fichier) ?? "Pièce jointe",
            notification: true,
          },
          author_petitionnaire: true,
        })),
        databaseConnection,
      );
      for (const { dossier } of newEdges) dossiersWithNewPiecesJointes.add(dossier);
    }
  }

  await Promise.all([orphanFichiersCleanedUp, newFichiersSynchronized]);
  return dossiersWithNewPiecesJointes;
}
