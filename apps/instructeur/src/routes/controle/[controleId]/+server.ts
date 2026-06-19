import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { supprimerContrôle, getDossierIdFromControle } from "@pitchou/server/database/controle.ts";
import type { ContrLeId } from "@pitchou/types/database/public/Contrôle.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const controleId = params.controleId as ContrLeId;

  const dossierId = await getDossierIdFromControle(controleId);
  await requireDossierAccessByCap(dossierId, cap);

  await supprimerContrôle(controleId);
  return new Response(null, { status: 204 });
};
