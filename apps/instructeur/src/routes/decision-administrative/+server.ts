import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import { createTransaction } from "@pitchou/server/database.ts";
import { dossiersAccessibleViaCap } from "@pitchou/server/database/dossier.ts";
import {
  updateDecisionAdministrative,
  addDecisionAdministrativeWithFichier,
} from "@pitchou/server/database/decision_administrative.ts";
import type { DecisionAdministrativeForTransfer } from "@pitchou/types/API_Pitchou.ts";

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const decisionData = (await request.json()) as DecisionAdministrativeForTransfer;

  if (!decisionData.dossier) {
    error(400, `Le 'dossier' est absent des données de décision administrative`);
  }

  const transaction = await createTransaction();
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
      ? await updateDecisionAdministrative(decisionData, transaction)
      : await addDecisionAdministrativeWithFichier(decisionData, transaction);

    await transaction.commit();
    return json(id);
  } catch (err) {
    if (!transaction.isCompleted()) {
      await transaction.rollback();
    }
    throw err;
  }
};
