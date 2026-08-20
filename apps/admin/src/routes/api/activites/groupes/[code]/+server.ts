// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
import { error, json } from "@sveltejs/kit";
import { getActiviteReferentiel, renameActiviteGroupe } from "@pitchou/server/database/activite.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import type { RequestHandler } from "./$types.ts";

export const PUT: RequestHandler = async ({ request, params }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["label"]));

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) error(400, "Le nom du groupe est requis");

  const { groupes } = await getActiviteReferentiel();
  if (groupes.some((groupe) => groupe.label === label && groupe.code !== params.code)) {
    error(409, "Un groupe d'activités avec ce nom existe déjà");
  }

  const renamed = await renameActiviteGroupe(params.code, label);
  if (!renamed) error(404, `Aucun groupe d'activités avec le code '${params.code}'`);

  return json({ succès: true });
};
