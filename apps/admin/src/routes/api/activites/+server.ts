// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
import { error, json } from "@sveltejs/kit";
import {
  createActivite,
  findActiviteLabelConflict,
  getActiviteReferentiel,
} from "@pitchou/server/database/activite.ts";
import { readJsonObject, rejectUnknownProperties } from "$lib/server/requestValidation.ts";
import { activiteCodeFromLabel } from "./codeFromLabel.ts";
import type { RequestHandler } from "./$types.ts";

export const GET: RequestHandler = async () => {
  return json(await getActiviteReferentiel());
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["label", "groupeCode"]));

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) error(400, "Le nom de l'activité est requis");

  const code = activiteCodeFromLabel(label);
  if (!code) error(400, "Le nom de l'activité doit contenir au moins une lettre ou un chiffre");

  const groupeCode = typeof body.groupeCode === "string" ? body.groupeCode : "";
  const referentiel = await getActiviteReferentiel();
  if (!referentiel.groupes.some((groupe) => groupe.code === groupeCode)) {
    error(400, "Le groupe d'activités demandé n'existe pas");
  }
  if (referentiel.activites.some((activite) => activite.code === code)) {
    error(409, "Une activité avec ce nom ou un nom trop proche existe déjà");
  }
  if (findActiviteLabelConflict(referentiel, code, label)) {
    error(409, "Ce nom est déjà utilisé par une autre activité ou l'un de ses libellés");
  }

  await createActivite(code, label, groupeCode);
  return json({ code, label }, { status: 201 });
};
