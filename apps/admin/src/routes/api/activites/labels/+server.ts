// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
import { error, json } from "@sveltejs/kit";
import {
  getActiviteReferentiel,
  reassignActiviteLabel,
} from "@pitchou/server/database/activite.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import type { RequestHandler } from "./$types.ts";

/**
 * Groups a raw « Activité principale » label under an activity and marks it as reviewed.
 * Accepting a flagged label as « Autre » is the same call with its current activity code.
 */
export const PUT: RequestHandler = async ({ request }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["label", "activiteCode"]));

  const label = typeof body.label === "string" ? body.label : "";
  const activiteCode = typeof body.activiteCode === "string" ? body.activiteCode : "";
  if (!label || !activiteCode) error(400, "Les propriétés 'label' et 'activiteCode' sont requises");

  const { activites } = await getActiviteReferentiel();
  if (!activites.some((activite) => activite.code === activiteCode)) {
    error(400, `Aucune activité avec le code '${activiteCode}'`);
  }

  const reassigned = await reassignActiviteLabel(label, activiteCode);
  if (!reassigned) error(404, "Ce libellé n'est pas dans le référentiel");

  return json({ succès: true });
};
