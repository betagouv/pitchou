import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type { PieceJointeDeletion } from "@pitchou/types/capabilities.ts";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { createTransaction } from "@pitchou/server/database.ts";
import { deletePieceJointe } from "@pitchou/server/database/piece_jointe.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getPersonneByDossierCap } from "@pitchou/server/database/personne.ts";

export const DELETE: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["dossier", "type", "entityId", "fileId"]));
  if (typeof body.dossier !== "number" || !Number.isInteger(body.dossier)) {
    error(400, "Le dossier doit être un nombre entier.");
  }
  if (
    typeof body.type !== "string" ||
    !["saisine", "avis", "decision", "autre"].includes(body.type)
  ) {
    error(400, "Ce type de pièce jointe ne peut pas être supprimé.");
  }
  for (const property of ["entityId", "fileId"] as const) {
    if (
      typeof body[property] !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body[property])
    ) {
      error(400, `La propriété '${property}' doit être un UUID.`);
    }
  }
  const piece = body as PieceJointeDeletion;
  await requireDossierAccessByCap(piece.dossier, cap);
  const transaction = await createTransaction();
  try {
    const name = await deletePieceJointe(piece, transaction);
    if (name === undefined) error(404, "Pièce jointe introuvable dans ce dossier.");
    const author = await getPersonneByDossierCap(cap, transaction);
    await logDossierActions(
      [
        {
          dossier: piece.dossier,
          type: "piece_jointe_supprimee",
          data: { name },
          author_personne: author?.id ?? null,
        },
      ],
      transaction,
    );
    await transaction.commit();
    return new Response(null, { status: 204 });
  } catch (cause) {
    if (!transaction.isCompleted()) await transaction.rollback();
    throw cause;
  }
};
