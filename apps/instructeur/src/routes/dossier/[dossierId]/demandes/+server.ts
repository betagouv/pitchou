import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireUserId, requireDossierWriteAccess } from "#lib/server/auth.ts";
import { readJsonObject, rejectUnknownProperties } from "#lib/server/requestValidation.ts";
import {
  getDossierWorkspace,
  createDemande,
  linkDemande,
} from "@pitchou/server/database/dossierDemandes.ts";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

export const GET: RequestHandler = async ({ params, locals }) => {
  const id = Number(params.dossierId) as DossierId;
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) error(400, "Demande invalide");
  const workspace = await getDossierWorkspace(id, requireUserId(locals));
  if (!workspace) error(403, "Dossier inaccessible");
  return json(workspace);
};

export const POST: RequestHandler = async ({ params, locals, request }) => {
  const userId = requireUserId(locals);
  const id = Number(params.dossierId) as DossierId;
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) error(400, "Demande invalide");
  const body = await readJsonObject(request);
  rejectUnknownProperties(body, new Set(["action", "label", "demandeId"]));
  if (body.action !== "create" && body.action !== "link") error(400, "Action inconnue");
  if (
    body.action === "create" &&
    (typeof body.label !== "string" || !body.label.trim() || body.label.length > 200)
  )
    error(400, "Renseignez un libellé de 1 à 200 caractères");
  if (
    body.action === "link" &&
    (!Number.isSafeInteger(body.demandeId) ||
      Number(body.demandeId) <= 0 ||
      Number(body.demandeId) > 2147483647)
  )
    error(400, "Identifiant de demande invalide");
  const demandeId = await db.transaction(async (trx) => {
    await requireDossierWriteAccess(id, userId, trx);
    if (body.action === "create") return createDemande(id, body.label as string, userId, trx);
    const otherId = body.demandeId as DossierId;
    await requireDossierWriteAccess(otherId, userId, trx);
    if (id === otherId || (await trx("dossier_demande").where({ dossier: otherId }).first()))
      error(409, "Cette demande appartient déjà à un dossier regroupé");
    await linkDemande(id, otherId, userId, trx);
    return otherId;
  });
  return json({ demandeId });
};
