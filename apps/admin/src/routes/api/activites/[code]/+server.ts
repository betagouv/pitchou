// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
import { error, json } from "@sveltejs/kit";
import {
  findActiviteLabelConflict,
  getActiviteReferentiel,
  renameActivite,
  setActiviteGroupe,
} from "@pitchou/server/database/activite.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import type { RequestHandler } from "./$types.ts";

/** Updates an activity: rename it and/or move it to another group. */
export const PUT: RequestHandler = async ({ request, params }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["label", "groupeCode"]));

  const label = typeof body.label === "string" ? body.label.trim() : "";
  const groupeCode = typeof body.groupeCode === "string" ? body.groupeCode : "";
  if (!label && !groupeCode) error(400, "Un nouveau nom ou un nouveau groupe est requis");

  const referentiel = await getActiviteReferentiel();

  if (groupeCode) {
    if (!referentiel.groupes.some((groupe) => groupe.code === groupeCode)) {
      error(400, "Le groupe d'activités demandé n'existe pas");
    }
    const moved = await setActiviteGroupe(params.code, groupeCode);
    if (!moved) error(404, `Aucune activité avec le code '${params.code}'`);
  }

  if (label) {
    if (findActiviteLabelConflict(referentiel, params.code, label)) {
      error(409, "Ce nom est déjà utilisé par une autre activité ou l'un de ses libellés");
    }
    const renamed = await renameActivite(params.code, label);
    if (!renamed) error(404, `Aucune activité avec le code '${params.code}'`);
  }

  return json({ succès: true });
};
