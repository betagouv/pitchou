import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation";
import {
  addControles,
  updateControle,
  getDossierIdFromControle,
} from "@pitchou/server/database/controle.ts";
import { getDossierIdFromPrescription } from "@pitchou/server/database/prescription.ts";
import type Controle from "@pitchou/types/database/public/Controle.ts";

const controleProperties = new Set([
  "id",
  "prescription",
  "controle_date",
  "result",
  "comment",
  "post_controle_action_type",
  "post_controle_action_date",
  "next_due_date",
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseControle(value: Record<string, unknown>): Partial<Controle> {
  rejectUnknownProperties(value, controleProperties);

  for (const property of ["id", "prescription"] as const) {
    if (
      value[property] !== undefined &&
      (typeof value[property] !== "string" || !uuidPattern.test(value[property]))
    ) {
      error(400, `La propriété '${property}' doit être un UUID valide.`);
    }
  }
  if (!value.id && !value.prescription) {
    error(400, `Un contrôle doit avoir un identifiant ou référencer une prescription.`);
  }

  for (const property of ["result", "comment", "post_controle_action_type"] as const) {
    if (
      value[property] !== undefined &&
      value[property] !== null &&
      typeof value[property] !== "string"
    ) {
      error(400, `La propriété '${property}' doit être une chaîne ou null.`);
    }
  }

  for (const property of ["controle_date", "post_controle_action_date", "next_due_date"] as const) {
    const rawDate = value[property];
    if (rawDate === undefined || rawDate === null) continue;
    if (typeof rawDate !== "string" || Number.isNaN(Date.parse(rawDate))) {
      error(400, `La propriété '${property}' doit être une date valide ou null.`);
    }
    value[property] = new Date(rawDate);
  }

  return value as Partial<Controle>;
}

export const POST: RequestHandler = async ({ url, request }) => {
  const cap = requireCap(url);
  const controleData = parseControle(await readJsonObject(request));

  if (controleData.id) {
    await requireDossierAccessByCap(await getDossierIdFromControle(controleData.id), cap);
  }
  if (controleData.prescription) {
    await requireDossierAccessByCap(
      await getDossierIdFromPrescription(controleData.prescription),
      cap,
    );
  }

  try {
    const controleId = controleData.id
      ? await updateControle(controleData)
      : await addControles(controleData);
    return json(controleId);
  } catch (err) {
    error(500, `Erreur lors de l'ajout/modification de contrôle. ${err}`);
  }
};
