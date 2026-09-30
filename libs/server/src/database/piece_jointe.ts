import type { Knex } from "knex";
import type { PieceJointeDeletion } from "@pitchou/types/capabilities.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";

const DELETABLE_REFERENCES = {
  saisine: { table: "avis_expert", column: "saisine_fichier" },
  avis: { table: "avis_expert", column: "avis_fichier" },
  decision: { table: "decision_administrative", column: "fichier" },
  autre: { table: "other_attachment", column: "fichier" },
} as const;

export async function deletePieceJointe(
  piece: PieceJointeDeletion,
  transaction: Knex.Transaction,
): Promise<string | undefined> {
  const { table, column } = DELETABLE_REFERENCES[piece.type];
  const reference = transaction(table).where({
    id: piece.entityId,
    dossier: piece.dossier,
    [column]: piece.fileId,
  });
  const row = await reference.clone().first().forUpdate();
  if (!row) return undefined;
  const file = await transaction("file").where({ id: piece.fileId }).first();

  // Avis and decisions retain their dates, prescriptions and other metadata.
  if (piece.type === "autre") await reference.delete();
  else await reference.update({ [column]: null });

  await deleteFichiersWithoutOtherReferences([piece.fileId], transaction);
  return file?.name ?? "Pièce jointe";
}
