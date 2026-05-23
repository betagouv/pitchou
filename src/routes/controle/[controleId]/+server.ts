import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { supprimerContrôle, getDossierIdFromControle } from "$server/database/controle.js";
import type { ContrLeId } from "$types/database/public/Contrôle.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const controleId = params.controleId as ContrLeId;

  const dossierId = await getDossierIdFromControle(controleId);
  await requireDossierAccessByCap(dossierId, cap);

  await supprimerContrôle(controleId);
  return new Response(null, { status: 204 });
};
