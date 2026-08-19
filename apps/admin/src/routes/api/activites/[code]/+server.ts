// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
import { error, json } from "@sveltejs/kit";
import { renameActivite } from "@pitchou/server/database/activite.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import type { RequestHandler } from "./$types.ts";

export const PUT: RequestHandler = async ({ request, params }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["label"]));

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) error(400, "Le nom de l'activité est requis");

  const renamed = await renameActivite(params.code, label);
  if (!renamed) error(404, `Aucune activité avec le code '${params.code}'`);

  return json({ succès: true });
};
