import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import { createTransaction } from "@pitchou/server/database.ts";
import { dossiersAccessibleViaCap } from "@pitchou/server/database/dossier.ts";
import {
  updateDecisionAdministrative,
  addDecisionAdministrativeWithFichier,
} from "@pitchou/server/database/decision_administrative.ts";
import type { DecisionAdministrativeForTransfer } from "@pitchou/types/API_Pitchou.ts";

const decisionProperties = new Set([
  "id",
  "dossier",
  "number",
  "type",
  "signature_date",
  "obligations_end_date",
  "fichier_base64",
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
    if (
      value[property] !== undefined &&
      value[property] !== null &&
      typeof value[property] !== "string"
    ) {
      error(400, `La propriété '${property}' doit être une chaîne ou null.`);
    }
  }
  for (const property of ["signature_date", "obligations_end_date"] as const) {
    const rawDate = value[property];
    if (rawDate === undefined || rawDate === null) continue;
    if (typeof rawDate !== "string" || Number.isNaN(Date.parse(rawDate))) {
      error(400, `La propriété '${property}' doit être une date valide ou null.`);
    }
    value[property] = new Date(rawDate);
  }

  const fichier = value.fichier_base64;
  if (fichier !== undefined) {
    if (!fichier || typeof fichier !== "object" || Array.isArray(fichier)) {
      error(400, `La propriété 'fichier_base64' doit être un objet.`);
    }
    const fichierData = fichier as Record<string, unknown>;
    rejectUnknownProperties(fichierData, new Set(["contenuBase64", "name", "media_type"]));
    for (const property of ["contenuBase64", "name", "media_type"] as const) {
      if (typeof fichierData[property] !== "string") {
        error(400, `La propriété 'fichier_base64.${property}' doit être une chaîne.`);
      }
    }
  }

  return value as ValidatedDecision;
}

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const decisionData = parseDecision(await readJsonObject(request));

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
