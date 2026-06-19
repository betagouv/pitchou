import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import { créerTransaction } from "@pitchou/server/database.ts";
import { dossiersAccessibleViaCap } from "@pitchou/server/database/dossier.ts";
import {
  modifierDécisionAdministrative,
  ajouterDécisionAdministrativeAvecFichier,
} from "@pitchou/server/database/décision_administrative.ts";
import type { DécisionAdministrativePourTransfer } from "@pitchou/types/API_Pitchou.ts";

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const decisionData = (await request.json()) as DécisionAdministrativePourTransfer;

  if (!decisionData.dossier) {
    error(400, `Le 'dossier' est absent des données de décision administrative`);
  }

  const transaction = await créerTransaction();
  try {
    const dossiersAccessibles = await dossiersAccessibleViaCap(
      decisionData.dossier,
      cap,
      transaction,
    );
    if (!dossiersAccessibles.has(decisionData.dossier)) {
      await transaction.rollback();
      error(
        400,
        `La capability ${cap} ne permet pas d'avoir accès au dossier ${decisionData.dossier}`,
      );
    }

    const id = decisionData.id
      ? await modifierDécisionAdministrative(decisionData, transaction)
      : await ajouterDécisionAdministrativeAvecFichier(decisionData, transaction);

    await transaction.commit();
    return json(id);
  } catch (err) {
    if (!transaction.isCompleted()) {
      await transaction.rollback();
    }
    throw err;
  }
};
