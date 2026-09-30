import { store } from "$lib/state/store.svelte.ts";
import { recordLocalWrite, refreshDossierFull } from "$lib/dossier/dossier.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { PieceJointeSimple } from "./piecesJointes.ts";

export async function deletePieceJointe(dossierId: DossierFull["id"], piece: PieceJointeSimple) {
  if (!piece.deletion || !piece.fileId || !store.capabilities.deletePieceJointe) {
    throw new Error("Vous ne pouvez pas supprimer cette pièce jointe.");
  }
  await store.capabilities.deletePieceJointe({
    dossier: dossierId,
    fileId: piece.fileId,
    ...piece.deletion,
  });
  recordLocalWrite(dossierId);
  refreshDossierFull(dossierId).catch((cause) =>
    console.error("Échec du rafraîchissement du dossier", cause),
  );
}
