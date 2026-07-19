import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import {
  addPrescription,
  updatePrescription,
  getDossierIdFromPrescription,
} from "@pitchou/server/database/prescription.ts";
import { getDossierIdFromDecisionAdministrative } from "@pitchou/server/database/decision_administrative.ts";
import type Prescription from "@pitchou/types/database/public/Prescription.ts";

const prescriptionProperties = new Set([
  "id",
  "decision_administrative",
  "due_date",
  "article_number",
  "description",
  "avoided_surface",
  "compensated_surface",
  "avoided_nids",
  "compensated_nids",
  "avoided_individus",
  "compensated_individus",
]);

function parsePrescription(value: Record<string, unknown>): Partial<Prescription> {
  rejectUnknownProperties(value, prescriptionProperties);

  for (const property of ["id", "decision_administrative"] as const) {
    if (
      value[property] !== undefined &&
      (typeof value[property] !== "string" || !value[property])
    ) {
      error(400, `La propriété '${property}' doit être une chaîne non vide.`);
    }
  }
  if (!value.id && !value.decision_administrative) {
    error(400, `Une nouvelle prescription doit référencer une décision administrative.`);
  }

  const dueDate = value.due_date;
  if (dueDate !== undefined && dueDate !== null) {
    if (typeof dueDate !== "string" || Number.isNaN(Date.parse(dueDate))) {
      error(400, `La propriété 'due_date' doit être une date valide ou null.`);
    }
    value.due_date = new Date(dueDate);
  }

  for (const property of ["article_number", "description"] as const) {
    if (
      value[property] !== undefined &&
      value[property] !== null &&
      typeof value[property] !== "string"
    ) {
      error(400, `La propriété '${property}' doit être une chaîne ou null.`);
    }
  }
  for (const property of [
    "avoided_surface",
    "compensated_surface",
    "avoided_nids",
    "compensated_nids",
    "avoided_individus",
    "compensated_individus",
  ] as const) {
    const quantity = value[property];
    if (
      quantity !== undefined &&
      quantity !== null &&
      (typeof quantity !== "number" || !Number.isFinite(quantity))
    ) {
      error(400, `La propriété '${property}' doit être un nombre ou null.`);
    }
  }

  return value as Partial<Prescription>;
}

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const prescriptionData = parsePrescription(await readJsonObject(request));

  let dossierId;
  if (prescriptionData.id) {
    dossierId = await getDossierIdFromPrescription(prescriptionData.id);
  } else if (prescriptionData.decision_administrative) {
    dossierId = await getDossierIdFromDecisionAdministrative(
      prescriptionData.decision_administrative,
    );
  }
  await requireDossierAccessByCap(dossierId, cap);

  try {
    const prescriptionId = prescriptionData.id
      ? await updatePrescription(prescriptionData)
      : await addPrescription(prescriptionData);
    return json(prescriptionId);
  } catch (err) {
    error(500, `Erreur lors de l'ajout/modification de prescription. ${err}`);
  }
};
