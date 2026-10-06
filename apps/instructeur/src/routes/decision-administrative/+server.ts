import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { parseUploadedFichier, throwUploadedFichierHttpError } from "$lib/server/uploadedFichier";
import { createTransaction } from "@pitchou/server/database.ts";
import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier.ts";
import {
  updateDecisionAdministrative,
  addDecisionAdministrativeWithFichier,
  getDossierIdFromDecisionAdministrative,
  getDecisionAdministratives,
} from "@pitchou/server/database/decision_administrative.ts";
import { logDossierActions } from "@pitchou/server/database/action_dossier.ts";
import { getUserById } from "@pitchou/server/database/personne.ts";
import type { DecisionAdministrativeForTransfer } from "@pitchou/types/API_Pitchou.ts";

const decisionProperties = new Set([
  "id",
  "dossier",
  "number",
  "type",
  "signature_date",
  "obligations_end_date",
  "fichier_upload",
]);

type ValidatedDecision = DecisionAdministrativeForTransfer & {
  dossier: NonNullable<DecisionAdministrativeForTransfer["dossier"]>;
};

function parseDecision(value: Record<string, unknown>): ValidatedDecision {
  rejectUnknownProperties(value, decisionProperties);

  if (typeof value.dossier !== "number" || !Number.isInteger(value.dossier)) {
    error(400, `La propriété 'dossier' doit être un nombre entier.`);
  }
  if (value.id !== undefined && (typeof value.id !== "string" || !value.id)) {
    error(400, `La propriété 'id' doit être une chaîne non vide.`);
  }
  for (const property of ["number", "type"] as const) {
    if (typeof value[property] !== "string" || !value[property].trim()) {
      error(400, `La propriété '${property}' est obligatoire et doit être une chaîne non vide.`);
    }
  }
  for (const property of ["signature_date", "obligations_end_date"] as const) {
    const rawDate = value[property];
    if (typeof rawDate !== "string" || Number.isNaN(Date.parse(rawDate))) {
      error(400, `La propriété '${property}' est obligatoire et doit être une date valide.`);
    }
    value[property] = new Date(rawDate);
  }

  value.fichier_upload = parseUploadedFichier(value.fichier_upload, "fichier_upload");

  return value as ValidatedDecision;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = requireUserId(locals);
  const decisionData = parseDecision(await readJsonObject(request));

  const transaction = await createTransaction();
  try {
    const dossiersAccessibles = await dossiersAccessibleToUser(
      decisionData.dossier,
      userId,
      transaction,
    );
    // Only an owning group can instruct the dossier.
    if (dossiersAccessibles.get(decisionData.dossier) !== "complet") {
      await transaction.rollback();
      error(400, `Accès au dossier ${decisionData.dossier} refusé`);
    }

    if (
      decisionData.id &&
      (await getDossierIdFromDecisionAdministrative(decisionData.id, transaction)) !==
        decisionData.dossier
    ) {
      error(403, "La décision administrative n'appartient pas au dossier");
    }

    let id: string;
    if (!decisionData.fichier_upload) {
      const existingDecision = decisionData.id
        ? (await getDecisionAdministratives(decisionData.dossier, transaction)).find(
            (decision) => decision.id === decisionData.id,
          )
        : undefined;
      if (!existingDecision?.fichier) {
        error(400, "Le fichier de la décision administrative est obligatoire.");
      }
    }
    try {
      id = decisionData.id
        ? await updateDecisionAdministrative(decisionData, transaction)
        : await addDecisionAdministrativeWithFichier(decisionData, transaction);
    } catch (err) {
      throwUploadedFichierHttpError(err);
    }

    const author = await getUserById(userId);
    await logDossierActions(
      [
        {
          dossier: decisionData.dossier,
          type: decisionData.id ? "decision_modifiee" : "decision_importee",
          data: { decision_type: decisionData.type ?? null },
          author_personne: author?.id ?? null,
        },
      ],
      transaction,
    );

    await transaction.commit();
    return json(id);
  } catch (err) {
    if (!transaction.isCompleted()) {
      await transaction.rollback();
    }
    throw err;
  }
};
