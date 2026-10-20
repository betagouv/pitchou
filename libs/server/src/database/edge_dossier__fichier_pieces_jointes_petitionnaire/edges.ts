import type { Knex } from "knex";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import { logActionsDossier } from "../action_dossier.ts";

export async function insertFileEdges(
  edgesFichierDossierPiecesJointePetitionnaires: { dossier: DossierId; fichier: FileId }[],
  dossiersWithNewPiecesJointes: Set<DossierId>,
  databaseConnection: Knex.Transaction | Knex,
) {
  if (edgesFichierDossierPiecesJointePetitionnaires.length > 0) {
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

    await databaseConnection("edge_dossier__fichier_pieces_jointes_petitionnaire")
      .insert(edgesFichierDossierPiecesJointePetitionnaires)
      .onConflict(["dossier", "fichier"])
      .ignore();

    if (newEdges.length > 0) {
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
}

export async function logRemovedFiles(
  edgesToDelete: { dossier: DossierId; fichier: FileId; name: string | null }[],
  databaseConnection: Knex.Transaction | Knex,
) {
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
}
