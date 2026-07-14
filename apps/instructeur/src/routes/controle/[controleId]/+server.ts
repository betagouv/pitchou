import type { RequestHandler } from "./$types";
import { requireCap, requireDossierAccessByCap } from "$lib/server/auth";
import { deleteControle, getDossierIdFromControle } from "@pitchou/server/database/controle.ts";
import type { ControleId } from "@pitchou/types/database/public/Controle.ts";

export const DELETE: RequestHandler = async ({ url, params }) => {
  const cap = requireCap(url);
  const controleId = params.controleId as ControleId;

  const dossierId = await getDossierIdFromControle(controleId);
  await requireDossierAccessByCap(dossierId, cap);

  await deleteControle(controleId);
  return new Response(null, { status: 204 });
};
