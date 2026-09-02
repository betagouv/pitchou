// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
import { error, json } from "@sveltejs/kit";
import { getActiviteReferentiel, updateActiviteGroupe } from "@pitchou/server/database/activite.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import type { RequestHandler } from "./$types.ts";

const HEX_COLOR = /^#[0-9a-f]{6}$/;

export const PUT: RequestHandler = async ({ request, params }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["label", "color"]));

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) error(400, "Le nom du groupe est requis");

  const color = typeof body.color === "string" ? body.color.trim().toLowerCase() : "";
  if (!HEX_COLOR.test(color)) {
    error(400, "La couleur du groupe doit être un code hexadécimal, par exemple '#fdedac'");
  }

  const { groupes } = await getActiviteReferentiel();
  if (groupes.some((groupe) => groupe.label === label && groupe.code !== params.code)) {
    error(409, "Un groupe d'activités avec ce nom existe déjà");
  }

  const updated = await updateActiviteGroupe(params.code, { label, color });
  if (!updated) error(404, `Aucun groupe d'activités avec le code '${params.code}'`);

  return json({ succès: true });
};
