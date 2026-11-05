import { error, json } from "@sveltejs/kit";
import { withAdminWriteAccess } from "#lib/server/writeAccess.ts";
import { parseDossierId, throwHttpErrorForAdminDossier } from "#lib/server/dossierValidation.ts";
import { parseOrganisation } from "#lib/server/dossierValidation/organisation.ts";
import { readJsonObject, rejectUnknownProperties } from "#lib/server/requestValidation.ts";
import {
  DossierPorteurReadOnlyError,
  updatePorteurFromAdmin,
  type AdminPorteurUpdate,
} from "@pitchou/server/database/dossier_admin/porteur.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";
import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";
import type { RequestHandler } from "./$types";

function parsePorteur(body: Record<string, unknown>): AdminPorteurUpdate {
  rejectUnknownProperties(body, new Set(["porteur_de_projet"]));
  const raw = body.porteur_de_projet;
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    error(400, "Les informations du porteur sont requises.");
  const { type, ...fields } = raw as Record<string, unknown>;
  if (type === "organisation") return { type, ...parseOrganisation(fields) };
  if (type === "personne_morale") {
    rejectUnknownProperties(fields, new Set(["siret"]));
    if (typeof fields.siret !== "string" || !/^[0-9]{14}$/u.test(fields.siret))
      error(400, "Le SIRET doit contenir 14 chiffres.");
    return { type, siret: fields.siret as EntrepriseSiret };
  }
  error(400, "Le porteur doit être une organisation ou une personne morale avec SIRET.");
}

// Hooks enforce session, route permissions and origin; the write guard rechecks permissions.
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const dossierId = parseDossierId(params.dossierId!);
  if (!Number.isSafeInteger(dossierId) || dossierId <= 0) error(400, "Invalid dossierId.");
  const porteur = parsePorteur(await readJsonObject(request));
  try {
    await withAdminWriteAccess(locals, "admin:dossiers:update", (trx, actor) =>
      updatePorteurFromAdmin(dossierId, porteur, actor.id, trx),
    );
  } catch (caught) {
    if (caught instanceof DossierPorteurReadOnlyError) error(409, caught.message);
    throwHttpErrorForAdminDossier(caught);
  }
  return json(await getDossierDetailForAdmin(dossierId));
};
